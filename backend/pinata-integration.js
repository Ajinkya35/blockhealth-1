const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

class PinataService {
  constructor(apiKey, apiSecret) {
    this.apiKey = apiKey;
    this.apiSecret = apiSecret;
    this.baseUrl = 'https://api.pinata.cloud';
  }

  // Upload JSON data to Pinata
  async pinJSONToIPFS(jsonData) {
    try {
      const url = `${this.baseUrl}/pinning/pinJSONToIPFS`;
      const response = await axios.post(
        url,
        jsonData,
        {
          headers: {
            'Content-Type': 'application/json',
            'pinata_api_key': this.apiKey,
            'pinata_secret_api_key': this.apiSecret
          }
        }
      );
      
      return response.data.IpfsHash;
    } catch (error) {
      console.error('Error uploading JSON to Pinata:', error);
      throw error;
    }
  }

  // Upload file to Pinata
  async pinFileToIPFS(filePath) {
    try {
      const url = `${this.baseUrl}/pinning/pinFileToIPFS`;
      
      const data = new FormData();
      data.append('file', fs.createReadStream(filePath));
      
      const response = await axios.post(
        url,
        data,
        {
          headers: {
            ...data.getHeaders(),
            'pinata_api_key': this.apiKey,
            'pinata_secret_api_key': this.apiSecret
          },
          maxContentLength: Infinity,
          maxBodyLength: Infinity
        }
      );
      
      return response.data.IpfsHash;
    } catch (error) {
      console.error('Error uploading file to Pinata:', error);
      throw error;
    }
  }

  // Get content from Pinata via IPFS gateway
  async getContent(cid) {
    try {
      // Use Pinata's gateway or any public IPFS gateway
      const url = `https://gateway.pinata.cloud/ipfs/${cid}`;
      const response = await axios.get(url);
      return response.data;
    } catch (error) {
      console.error('Error retrieving content from IPFS:', error);
      throw error;
    }
  }
}

module.exports = PinataService;