const nodemailer = require("nodemailer");

//Create transporter object to establish a connection between the application server and Gmail server
const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.EMAIL,
        pass: process.env.EMAIL_PASSWORD,
    },
})

//Function to send email to student
const sendEmail = async function (email, message) {
    try {
        //Send email to the student with the provided message in text 
        await transporter.sendMail({
            from: process.env.EMAIL,
            to: email,
            subject: "Internship Application Status",
            text: message
        });
    } catch (error) {
        //Log error if email sending fails
        console.log("Email sending failed", error.message);
    }
}

module.exports = {sendEmail};