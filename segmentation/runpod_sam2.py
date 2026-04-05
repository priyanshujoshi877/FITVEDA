"""
RunPod Flash SAM2 endpoint for video segmentation.

Usage:
  1. Set RUNPOD_API_KEY in .env
  2. source /tmp/runpod-env/bin/activate
  3. flash run  (from this directory)
  4. POST to http://localhost:8888/gpu/segment with {"video_base64": "..."}

Or run directly:
  python runpod_sam2.py
"""

import asyncio
from runpod_flash import remote, LiveServerless, GpuGroup

gpu_config = LiveServerless(
    name="jigglewiggle-sam2",
    gpus=[GpuGroup.AMPERE_80],  # A100 80GB
    workersMin=0,
    workersMax=3,
    idleTimeout=300,
)

SAM2_DEPENDENCIES = [
    "torch==2.4.1",
    "torchvision==0.19.1",
    "opencv-python==4.10.0.84",
    "pycocotools",
    "huggingface_hub==0.25.2",
    "ffmpeg-python==0.2.0",
    "sam-2 @ git+https://github.com/facebookresearch/sam2.git@c2ec8e14a185632b0a5d8b161928ceb50197eddc",
]


@remote(
    resource_config=gpu_config,
    dependencies=SAM2_DEPENDENCIES,
    system_dependencies=["ffmpeg"],
)
async def segment_video(input_data: dict) -> dict:
    """Accept base64 video, run SAM2 segmentation, return base64 mask video."""
    import base64
    import subprocess
    import tempfile
    from pathlib import Path

    import numpy as np
    import torch
    from PIL import Image

    video_b64 = input_data.get("video_base64", "")
    if not video_b64:
        return {"error": "No video_base64 provided"}

    # Strip data URL prefix if present
    if "," in video_b64:
        video_b64 = video_b64.split(",", 1)[1]

    video_bytes = base64.b64decode(video_b64)

    # Write video to temp file
    tmp_dir = Path(tempfile.mkdtemp())
    input_path = tmp_dir / "input.mp4"
    input_path.write_bytes(video_bytes)

    # Convert video to frames using subprocess (ffmpeg-python can be flaky)
    frames_dir = tmp_dir / "frames"
    frames_dir.mkdir()
    subprocess.run(
        ["ffmpeg", "-y", "-i", str(input_path), "-qscale:v", "2",
         "-start_number", "0", f"{frames_dir}/%05d.jpg"],
        capture_output=True, check=True,
    )

    frame_names = sorted(
        [p for p in frames_dir.iterdir() if p.suffix in [".jpg", ".jpeg"]],
        key=lambda p: int(p.stem),
    )

    if not frame_names:
        return {"error": "No frames extracted from video"}

    # Load SAM2 model (cached in globals after first load on this worker)
    import builtins
    if not hasattr(builtins, "_sam2_predictor"):
        from sam2.sam2_video_predictor import SAM2VideoPredictor
        builtins._sam2_predictor = SAM2VideoPredictor.from_pretrained(
            "facebook/sam2-hiera-large"
        )
        print("SAM2 model loaded and cached")

    video_predictor = builtins._sam2_predictor

    # Use center of first frame as initial point
    width, height = Image.open(frame_names[0]).size
    points = np.array([[width // 2, height // 2]], dtype=np.float32)
    labels = np.array([1], np.int32)

    with torch.inference_mode(), torch.autocast("cuda", dtype=torch.bfloat16):
        inference_state = video_predictor.init_state(video_path=str(frames_dir))

        video_predictor.add_new_points_or_box(
            inference_state=inference_state,
            frame_idx=0,
            obj_id=1,
            points=points,
            labels=labels,
        )

        video_segments = {}
        for out_frame_idx, out_obj_ids, out_mask_logits in video_predictor.propagate_in_video(
            inference_state
        ):
            video_segments[out_frame_idx] = {
                out_obj_id: (out_mask_logits[i] > 0.0).cpu().numpy()
                for i, out_obj_id in enumerate(out_obj_ids)
            }

    # Render mask frames
    mask_dir = tmp_dir / "masks"
    mask_dir.mkdir()

    for frame_idx in range(len(frame_names)):
        frame = Image.open(frame_names[frame_idx])
        w, h = frame.size
        mask_img = np.zeros((h, w, 3), dtype=np.uint8)

        if frame_idx in video_segments:
            for obj_id, mask in video_segments[frame_idx].items():
                mask_2d = mask.squeeze()
                mask_img[mask_2d] = [255, 255, 255]

        Image.fromarray(mask_img).save(mask_dir / f"{frame_idx:05d}.png")

    # Get input video fps
    import ffmpeg as ffmpeg_lib
    probe = ffmpeg_lib.probe(str(input_path))
    video_stream = next(s for s in probe["streams"] if s["codec_type"] == "video")
    fps_parts = video_stream["r_frame_rate"].split("/")
    fps = int(fps_parts[0]) / int(fps_parts[1])

    # Encode mask frames to video
    output_path = tmp_dir / "mask.mp4"
    cmd = [
        "ffmpeg", "-y",
        "-framerate", str(fps),
        "-i", f"{mask_dir}/%05d.png",
        "-vf", "pad=ceil(iw/2)*2:ceil(ih/2)*2",
        "-c:v", "libx264",
        "-pix_fmt", "yuv420p",
        str(output_path),
    ]
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        return {"error": f"ffmpeg encode failed: {result.stderr[-500:]}"}

    result_bytes = output_path.read_bytes()
    result_b64 = base64.b64encode(result_bytes).decode("utf-8")

    return {
        "mask_video_base64": result_b64,
        "num_frames": len(frame_names),
        "fps": fps,
    }


async def main():
    """Quick test with a synthetic video."""
    import base64
    import subprocess
    import time

    # Create test video
    subprocess.run(
        ["ffmpeg", "-y", "-f", "lavfi", "-i",
         "color=c=black:s=320x240:d=1,drawbox=x=100:y=60:w=120:h=120:color=white:t=fill",
         "-c:v", "libx264", "-pix_fmt", "yuv420p", "/tmp/test_runpod_sam2.mp4"],
        capture_output=True,
    )

    with open("/tmp/test_runpod_sam2.mp4", "rb") as f:
        video_b64 = base64.b64encode(f.read()).decode("utf-8")

    print("Sending to RunPod...")
    start = time.time()
    result = await segment_video({"video_base64": video_b64})
    elapsed = time.time() - start

    if hasattr(result, "output"):
        # Queue-based: JobOutput wrapper
        output = result.output
        if result.error:
            print(f"Error: {result.error}")
            return
    else:
        output = result

    if "error" in output:
        print(f"Error: {output['error']}")
    else:
        mask_bytes = base64.b64decode(output["mask_video_base64"])
        print(f"Success! Took {elapsed:.1f}s")
        print(f"Frames: {output['num_frames']}, FPS: {output['fps']}")
        print(f"Mask video size: {len(mask_bytes)} bytes")


if __name__ == "__main__":
    asyncio.run(main())
