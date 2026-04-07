import cloudinary
import cloudinary.uploader
import cloudinary.api
from server.config.env import CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET
# Import the CloudinaryImage and CloudinaryVideo methods for the simplified syntax used in this guide
from cloudinary import CloudinaryImage

cloudinary.config( 
  cloud_name = CLOUDINARY_CLOUD_NAME, 
  api_key = CLOUDINARY_API_KEY, 
  api_secret = CLOUDINARY_API_SECRET
)

def upload_file(file_data: bytes, folder: str = "faces") -> str:
    response = cloudinary.uploader.upload(file_data, folder=folder)
    return response.get("secure_url")
