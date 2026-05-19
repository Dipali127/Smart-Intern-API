//cloudinary code:
const cloudinary = require('cloudinary').v2;
const fs = require('fs');

//Connect the application server to Cloudinary cloud storage using credentials from environment variables
cloudinary.config({ 
    cloud_name: process.env.Cloudinary_Cloud_Name,
    api_key: process.env.Cloudinary_Api_Key, 
    api_secret: process.env.Cloudinary_Api_Secret 
});

const uploadFileOnCloudinary = async function(localFilePath){
    try{
        if(!localFilePath){
            return null;
        }

        const response = await cloudinary.uploader.upload(localFilePath, {
            resource_type : "auto"  
        })
        
        //File has been uploaded successfully
        console.log(`file uploaded successfully ${response.url}`)
       
        return response;

    }catch(error){
        console.error(`Upload failed: ${error.message}`);
      //Remove locally saved temporary file as the upload operation failed
        fs.unlinkSync(localFilePath);
        return null;
    }
}

module.exports = uploadFileOnCloudinary;
