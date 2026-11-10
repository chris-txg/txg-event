import os
import uuid
from pathlib import Path
from typing import Any, Optional, Union
from django.conf import settings
from django.core.exceptions import ValidationError
from django.core.files.uploadedfile import UploadedFile
from PIL import Image, ImageOps

ALLOWED_IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".bmp", ".tiff"}
MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024  # 5 MB


def validate_image_file(
    file_obj: Any,
    max_size_bytes: int = MAX_IMAGE_SIZE_BYTES,
    allowed_extensions: Optional[set[str]] = None,
) -> None:
    """
    Validates uploaded image file size, extension, and binary header integrity.
    Prevents disguised files (e.g. .exe or .svg containing script injections).
    """
    if not file_obj:
        return

    allowed = allowed_extensions or ALLOWED_IMAGE_EXTENSIONS

    # 1. Check file size
    if file_obj.size > max_size_bytes:
        max_mb = max_size_bytes / (1024 * 1024)
        raise ValidationError(f"Image file size cannot exceed {max_mb:.0f} MB.")

    # 2. Check extension
    filename = getattr(file_obj, "name", "")
    ext = os.path.splitext(filename)[1].lower()
    if ext not in allowed:
        raise ValidationError(
            f"Unsupported image format '{ext}'. Allowed formats: {', '.join(sorted(allowed))}."
        )

    # 3. Verify image integrity with Pillow
    try:
        current_pos = file_obj.tell() if hasattr(file_obj, "tell") else 0
        file_obj.seek(0)
        with Image.open(file_obj) as img:
            img.verify()
        file_obj.seek(current_pos)
    except Exception:
        raise ValidationError("Uploaded file is corrupted or not a valid image.")


def convert_image_to_webp(
    source_file_path: Union[str, Path],
    output_dir_relative: str,
    max_dimensions: tuple[int, int] = (800, 800),
    quality: int = 85,
    delete_source: bool = True,
) -> str:
    """
    Reusable utility: Converts any image on disk to WebP format with:
    - Auto-rotation based on EXIF orientation metadata
    - Color space normalization (CMYK / Palette -> RGB, preserving RGBA for transparency)
    - High-quality Lanczos downscaling
    - Clean WebP compression
    - Optional deletion of the source/temporary file

    Returns:
        Relative media path to the saved WebP file (e.g. 'avatars/<user_id>/<uuid>.webp').
    """
    source_path = Path(source_file_path)
    if not source_path.exists():
        raise FileNotFoundError(f"Source image '{source_path}' does not exist.")

    media_root = Path(settings.MEDIA_ROOT)
    output_folder = media_root / output_dir_relative
    output_folder.mkdir(parents=True, exist_ok=True)

    webp_filename = f"{uuid.uuid4().hex}.webp"
    target_full_path = output_folder / webp_filename

    with Image.open(source_path) as img:
        # 1. Correct mobile orientation from EXIF
        img = ImageOps.exif_transpose(img) or img

        # 2. Normalize color modes
        if img.mode in ("RGBA", "LA") or (img.mode == "P" and "transparency" in img.info):
            # Preserve transparent alpha channel in WebP
            img = img.convert("RGBA")
        else:
            # Convert CMYK, Palette, Grayscale to standard RGB
            img = img.convert("RGB")

        # 3. Downscale if larger than max dimensions (keeps aspect ratio)
        img.thumbnail(max_dimensions, Image.Resampling.LANCZOS)

        # 4. Save as WebP
        img.save(
            target_full_path,
            format="WEBP",
            quality=quality,
            method=6,  # Best compression speed/size tradeoff
        )

    # 5. Delete temporary source file if requested
    if delete_source and source_path.resolve() != target_full_path.resolve():
        try:
            if source_path.exists():
                source_path.unlink()
        except OSError:
            pass

    # Return relative path inside MEDIA_ROOT
    relative_path = os.path.relpath(target_full_path, media_root).replace("\\", "/")
    return relative_path

