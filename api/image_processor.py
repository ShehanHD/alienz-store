import io
from PIL import Image


def process_image(
    data: bytes,
    max_width: int = 1200,
    thumbnail_size: tuple[int, int] = (300, 300),
) -> tuple[bytes, bytes]:
    """
    Process an uploaded image.
    Returns (full_webp_bytes, thumbnail_webp_bytes).
    Resizes proportionally if width > max_width. Thumbnail is a centre-cropped square.
    """
    with Image.open(io.BytesIO(data)) as img:
        img = img.convert("RGB")

        # Resize full image if too wide
        if img.width > max_width:
            ratio = max_width / img.width
            new_height = int(img.height * ratio)
            img = img.resize((max_width, new_height), Image.LANCZOS)

        full_buf = io.BytesIO()
        img.save(full_buf, "WEBP", quality=85)
        full_bytes = full_buf.getvalue()

        # Thumbnail: centre-crop to square, then resize
        thumb = img.copy()
        min_dim = min(thumb.width, thumb.height)
        left = (thumb.width - min_dim) // 2
        top = (thumb.height - min_dim) // 2
        thumb = thumb.crop((left, top, left + min_dim, top + min_dim))
        thumb = thumb.resize(thumbnail_size, Image.LANCZOS)

        thumb_buf = io.BytesIO()
        thumb.save(thumb_buf, "WEBP", quality=80)
        thumb_bytes = thumb_buf.getvalue()

    return full_bytes, thumb_bytes
