//Load environment variables from .env file
require('dotenv').config();

const express = require('express');
const app = express();
//Middleware to handle json data
app.use(express.json())

//Middleware to handle URL-encoded form data
app.use(express.urlencoded({ extended: true }))

const port = process.env.PORT || 3000;

//Import route
const studentRoute = require('./router/studentRoutes.js');
const companyRoute = require('./router/companyRoutes.js');
const internshipRoute = require('./router/internshipRoutes.js');
const applicationRoute = require('./router/applicationRoutes.js');

const mongoose = require('mongoose');
//Connect to MongoDB using connection string from environment variables
mongoose.connect(process.env.MONGO_URI).then(() => { console.log("mongoDB connected successfully") })
    .catch((error) => { console.log(error.message) });

//Use routes defined in the 'router/routes' module
app.use('/student',studentRoute);
app.use('/company', companyRoute);
app.use('/internship', internshipRoute);
app.use('/application', applicationRoute);

// route for incorrect endpoints.
app.all("*",(req,res)=>{res.status(404).send({status:false,message:"Endpoint is not correct"})})

//Start the server and listen on the specified port
app.listen(port, () => { console.log(`Server listening on port ${port}`) });








