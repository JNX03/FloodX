import express from 'express';
import fetch from 'node-fetch';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const app = express();
const PORT = 5000;

// Emulate __dirname using import.meta.url
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(cors());

app.get('/proxy', async (req, res) => {
  try {
    const { datestart, dateend } = req.query;
    const url = `https://hydro-1.net/Data/HD-04/houly/water_today_excel.php?station01=P.1&datestart=${datestart}&dateend=${dateend}`;
    
    console.log(`Fetching data from: ${url}`);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0',
        'Accept': 'application/vnd.ms-excel',
      },
    });

    if (!response.ok) {
      console.error('Error fetching data:', response.statusText);
      res.status(response.status).send('Error fetching data');
      return;
    }

    // Use arrayBuffer instead of buffer as per deprecation warning
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Save the file locally
    const filePath = path.join(__dirname, 'data.xls');
    fs.writeFileSync(filePath, buffer);

    console.log('File downloaded and saved as data.xls');

    // Send a success message
    res.status(200).send('File downloaded and saved successfully.');
  } catch (error) {
    console.error('Error in proxy server:', error);
    res.status(500).send('Error fetching data');
  }
});

// Endpoint to serve the saved file
app.get('/download', (req, res) => {
  const filePath = path.join(__dirname, 'data.xls');
  if (fs.existsSync(filePath)) {
    res.download(filePath, 'data.xls', (err) => {
      if (err) {
        console.error('Error sending file:', err);
        res.status(500).send('Error sending file');
      }
    });
  } else {
    res.status(404).send('File not found');
  }
});

app.listen(PORT, () => {
  console.log(`Proxy server is running on port ${PORT}`);
});
