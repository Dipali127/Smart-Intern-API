const companyModel = require('../models/companyModel.js');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken')
const validation = require('../validator/validation.js');


// Company registration and login refer to the authorized member of the company, such as an employer, manager  
// or HR personnel, who can post about the active internship in their company. 

//Register Company:
const registerCompany = async function (req, res) {
    try {
        const data = req.body;
        if (validation.isEmpty(data)) {
            return res.status(400).send({ status: false, message: "Provide details for registration" });
        }

        const { companyName, companyEmail, password, contactNumber } = data;

        //Validate mandatory details
        if (!validation.checkData(companyName)) {
            return res.status(400).send({ status: false, message: "CompanyName is required" });
        }

        if (!validation.checkData(companyEmail)) {
            return res.status(400).send({ status: false, message: "Email is required" });
        }

        if (!validation.checkEmail(companyEmail)) {
            return res.status(400).send({ status: false, message: "Invalid email" });
        }
         
        //Check if the provided email already exist in database        
        const existingEmail = await companyModel.findOne({ companyEmail: companyEmail });
        if (existingEmail) {
            return res.status(409).send({ status: false, message: "The provided email already exists" });
        }

        if (!validation.checkData(password)) {
            return res.status(400).send({ status: false, message: "Password is required" });
        }

        if (!validation.checkPassword(password)) {
            return res.status(400).send({ status: false, message: "Invalid password" });
        }

         //Hash the password before saving it in database
        const encryptPassword = await bcrypt.hash(password, 10);

        if (!validation.checkData(contactNumber)) {
            return res.status(400).send({ status: false, message: "Contact number is required" });
        }
       
        //Check if the provided contact number already exist in database
        const existingContact = await companyModel.findOne({contactNumber:contactNumber});

        if(existingContact){
            return res.status(409).send({status:false,message:"Provided contact number already exists"});
        }

       //Prepare the new company details, including the hashed password
        const newDetails = {
            companyName: companyName,
            companyEmail: companyEmail,
            password: encryptPassword,
            contactNumber: contactNumber
        };

        const createCompany = await companyModel.create(newDetails);
        return res.status(201).send({ status: true, message: "Company Registered Successfully", data: createCompany });
    } catch (error) {
        return res.status(500).send({ status: false, message: error.message });
    }
}

//Company Login:
const companyLogin = async function (req, res) {
    try {
        const data = req.body;
        if (validation.isEmpty(data)) {
            return res.status(400).send({ status: false, message: "Provide details for login" });
        }

        const { companyEmail, password } = data;
        
        //Validate email and password
        if (!validation.checkData(companyEmail)) {
            return res.status(400).send({ status: false, message: "Provide email for login" });
        }

        if (!validation.checkEmail(companyEmail)) {
            return res.status(400).send({ status: false, message: "Invalid email" });
        }

        //Check if the provided email doesn't exist in database
        const isEmailExist = await companyModel.findOne({ companyEmail: companyEmail });
        if (!isEmailExist) {
            return res.status(404).send({ status: false, message: "Email not found" });
        }

        if (!validation.checkData(password)) {
            return res.status(400).send({ status: false, message: "Provide password for login" });
        }

        if (!validation.checkPassword(password)) {
            return res.status(400).send({ status: false, message: "Invalid password" });
        }

        //Compare hashedPassword with the company provided password
        const comparePassword = await bcrypt.compare(password, isEmailExist.password);
        if (!comparePassword) {
            return res.status(400).send({ status: false, message: "Invalid password" });
        }

        //Generate token for company
        const token = jwt.sign({
            companyID: isEmailExist._id.toString(),
            user: "company"
        }, process.env.SECRET_KEY, { expiresIn: "1h" });

        // Set the generated token in the response header
        res.set('Authorization', `Bearer ${token}`);

        return res.status(200).send({ status: true, message: "Company Login Successfully", token: token });
    } catch (error) {
        return res.status(500).send({ status: false, message: error.message });
    }
}

module.exports = { registerCompany, companyLogin };
