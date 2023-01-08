const express = require('express');
const app = express();
const cors = require("cors");
const bodyParser = require("body-parser");
const path = require("path");
const PORT = process.env.PORT || 3000;
const apiRouter = require('./api');
//cors
app.use(cors());
// bodyParser
app.use(bodyParser.json());

// Import & mount API router 

app.use("/Envelope", apiRouter);
//render static files
const buildPath = path.normalize(path.join(__dirname, '../client/build'));
app.use(express.static(buildPath));
// Server listening 
app.listen(PORT, ()=>{
    console.log(`Server is running on port:${PORT}`)
})