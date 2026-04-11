import io
import pytest
from PIL import Image
from api.image_processor import process_image

pytestmark = pytest.mark.no_db


def _make_image(width: int, height: int) -> bytes:
    img = Image.new("RGB", (width, height), color=(255, 0, 0))
    buf = io.BytesIO()
    img.save(buf, "JPEG")
    return buf.getvalue()


def test_wide_image_is_resized():
    data = _make_image(2400, 1200)
    full, thumb = process_image(data, max_width=1200)
    with Image.open(io.BytesIO(full)) as img:
        assert img.width == 1200
        assert img.height == 600  # proportional


def test_small_image_not_upscaled():
    data = _make_image(800, 600)
    full, _ = process_image(data, max_width=1200)
    with Image.open(io.BytesIO(full)) as img:
        assert img.width == 800  # unchanged


def test_thumbnail_is_300x300():
    data = _make_image(1200, 800)
    _, thumb = process_image(data)
    with Image.open(io.BytesIO(thumb)) as img:
        assert img.size == (300, 300)


def test_output_is_webp():
    data = _make_image(400, 400)
    full, thumb = process_image(data)
    assert Image.open(io.BytesIO(full)).format == "WEBP"
    assert Image.open(io.BytesIO(thumb)).format == "WEBP"
