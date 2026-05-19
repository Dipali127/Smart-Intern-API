const express = require('express');
const router = express.Router();
const internshipController = require('../controllers/internshipController');
const jwt = require('../middleware/auth')

//>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>company>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>//

//Route to generate AI description for internship (requires authentication)
router.post('/generateAIDescription', jwt.authentication, internshipController.generateAIDescription)

//Route for company to post a new internship (requires authentication)
router.post('/postInternship/:companyId', jwt.authentication,internshipController.postInternship)

//Route to update internship details (requires authentication)
router.put('/updateInternship/:internshipId', jwt.authentication, internshipController.updateInternship)

//>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>student>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>//

//Route to get all internships (requires authentication)
router.get('/getInternship', jwt.authentication,internshipController.getInternship)

//Route to get internship by ID (requires authentication)
router.get('/getInternshipById/:internshipId', jwt.authentication, internshipController.getInternshipById)


module.exports = router;