const jwt = require('jsonwebtoken');

// const Student = require('./../models/studentModel');
// const Landlord = require('./../models/landlordModel');
const User = require('../models/userModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('./../utils/appError');

const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
};

const createSendToken = (user, statusCode, res) => {
  const token = signToken(user._id);

  const cookieOptions = {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000
    ),
    httpOnly: true,
  };

  if (process.env.NODE_ENV === 'production') cookieOptions.secure = true;

  res.cookie('jwt', token, cookieOptions);

  // Remove the password from the output
  user.password = undefined;

  res.status(statusCode).json({
    status: 'success',
    token,
    data: {
      user,
    },
  });
};

exports.signup = catchAsync(async (req, res, next) => {
  const { userType } = req.body;

  if (userType === 'student') {
    // Check if any of the required fields are empty
    const requiredFields = [
      'userType',
      'firstName',
      'lastName',
      'age',
      'academic',
      'department',
      'yearbook',
      'gender',
      'email',
      'password',
      'passwordConfirm',
    ];

    for (const field of requiredFields) {
      if (!req.body[field]) {
        return next(new AppError('All fields must be filled.', 400));
      }
    }

    const newStudent = await User.create({
      userType: req.body.userType,
      firstName: req.body.firstName,
      lastName: req.body.lastName,
      age: req.body.age,
      academic: req.body.academic,
      department: req.body.department,
      yearbook: req.body.yearbook,
      gender: req.body.gender,
      email: req.body.email,
      password: req.body.password,
      passwordConfirm: req.body.passwordConfirm,
    });

    createSendToken(newStudent, 200, res);
  }
  // the user is landLord
  else {
    // Check if any of the required fields are empty
    const requiredFields = [
      'userType',
      'firstName',
      'lastName',
      'age',
      'gender',
      'email',
      'password',
      'passwordConfirm',
    ];

    for (const field of requiredFields) {
      if (!req.body[field]) {
        return next(new AppError('All fields must be filled.', 400));
      }
    }

    const newLandlord = await User.create({
      userType: req.body.userType,
      firstName: req.body.firstName,
      lastName: req.body.lastName,
      age: req.body.age,
      gender: req.body.gender,
      email: req.body.email,
      password: req.body.password,
      passwordConfirm: req.body.passwordConfirm,
    });

    createSendToken(newLandlord, 200, res);
  }
});

exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  // 1) Check if email and password exist
  if (!email || !password) {
    return next(new AppError('Please provide email and password!', 400));
  }

  // 2) Check if student exists && password is correct
  const user = await User.findOne({ email }).select('+password');

  if (!user || !(await user.correctPassword(password, user.password))) {
    return next(new AppError('Incorrect email or password', 401));
  }

  // 3) If everything ok, send token to client
  createSendToken(user, 200, res);
});
