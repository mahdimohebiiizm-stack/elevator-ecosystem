import pytest

from infrastructure.storage.s3 import S3StorageClient


@pytest.mark.asyncio
async def test_s3_storage_upload_download_and_delete() -> None:
    """
    Test S3 object storage operations: ensure bucket, upload, presigned URL, and delete.
    """
    client = S3StorageClient(
        endpoint_url="http://localhost:9000",
        bucket_name="test-shopbot-media",
    )

    # 1. Ensure bucket exists
    await client.ensure_bucket_exists()

    # 2. Upload file
    test_data = b"OggS....AUDIO_VOICE_NOTE_BINARY_PAYLOAD...."
    object_key = "voice_notes/customer_123/sample.ogg"

    uploaded_key = await client.upload_file(
        file_data=test_data,
        key=object_key,
        content_type="audio/ogg",
    )
    assert uploaded_key == object_key

    # 3. Generate presigned URL
    url = await client.generate_presigned_url(
        key=object_key,
        expiration_seconds=1800,
    )
    assert isinstance(url, str)
    assert object_key in url

    # 4. Delete file
    deleted = await client.delete_file(key=object_key)
    assert deleted is True
