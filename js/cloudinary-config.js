var CLOUDINARY_CONFIG = {

  cloudName: "dmbfieuqm",
  uploadPreset: "snfitness-unsigned"
};

/**
 * Upload a File object to Cloudinary using the unsigned upload API.
 * Returns a Promise that resolves to the secure HTTPS image URL.
 *
 * @param {File}   file        - The image file chosen by the admin
 * @param {string} [publicId]  - Optional: a stable public_id (e.g. member Firestore doc ID)
 * @returns {Promise<string>}  - Resolves to the Cloudinary secure_url
 */
function uploadToCloudinary(file, publicId) {
  return new Promise(function (resolve, reject) {

    if (!CLOUDINARY_CONFIG.cloudName || CLOUDINARY_CONFIG.cloudName === "YOUR_CLOUD_NAME") {
      reject(new Error("Cloudinary not configured. Open js/cloudinary-config.js and add your Cloud Name and Upload Preset."));
      return;
    }

    var formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", CLOUDINARY_CONFIG.uploadPreset);

    if (publicId) {
      formData.append("public_id", "snfitness-members/" + publicId);
    }

    var url = "https://api.cloudinary.com/v1_1/" +
      CLOUDINARY_CONFIG.cloudName + "/image/upload";

    var xhr = new XMLHttpRequest();
    xhr.open("POST", url, true);

    xhr.onload = function () {
      if (xhr.status === 200) {
        try {
          var res = JSON.parse(xhr.responseText);
          // Always use the secure (HTTPS) URL
          resolve(res.secure_url);
        } catch (parseErr) {
          reject(new Error("Cloudinary returned an unexpected response."));
        }
      } else {
        try {
          var errBody = JSON.parse(xhr.responseText);
          reject(new Error("Cloudinary error: " + (errBody.error && errBody.error.message || xhr.statusText)));
        } catch (_) {
          reject(new Error("Cloudinary upload failed with status " + xhr.status));
        }
      }
    };

    xhr.onerror = function () {
      reject(new Error("Network error while uploading to Cloudinary. Check your internet connection."));
    };

    xhr.send(formData);
  });
}
