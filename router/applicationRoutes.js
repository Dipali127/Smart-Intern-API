const express = require('express');
const router = express.Router();
const applicationController = require('../controllers/applicationController');
const jwt = require('../middleware/auth')
const uploadFile = require('../middleware/multer.middleware')

//>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>student>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>//
//Route for student to apply to an internship with resume upload (requires authentication)
router.post('/apply/:studentID',jwt.authentication,uploadFile,applicationController.applyInternship)

//>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>company>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>//

//Route to get all students who applied for a specific internship (requires authentication)
router.get('/getAllAppliedStudents/:internshipId', jwt.authentication, applicationController.getAllAppliedStudents)

//Route to update application status and notify the student via email (requires authentication)
router.patch('/updateStatus/:applicationId', jwt.authentication, applicationController.reviewApplicant)

module.exports = router;