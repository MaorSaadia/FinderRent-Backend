const Apartment = require("./../models/apartmentModel");
const User = require("../models/userModel");
const APIFeatures = require("./../utils/apiFeatures");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");

exports.getAllApartments = async (req, res) => {
  try {
    //EXECUTE THE QUERY
    const features = new APIFeatures(Apartment.find(), req.query)
      .filter()
      .sort()
      .limitFields()
      .paginate();

    const apartments = await features.query;

    //SEND RESPONSE
    res.status(200).json({
      status: "success",
      results: apartments.length,
      data: {
        apartments,
      },
    });
  } catch (err) {
    res.status(404).json({
      status: "fail",
      message: err,
    });
  }
};

exports.getApartment = async (req, res) => {
  try {
    const apartment = await Apartment.findById(req.params.id);

    res.status(200).json({
      status: "success",
      data: { apartment },
    });
  } catch (err) {
    res.status(404).json({
      status: "fail",
      message: err,
    });
  }
};

exports.createApartment = catchAsync(async (req, res, next) => {
  // console.log(req.body);

  const data = req.body;
  const { latitude, longitude } = req.body.address.coordinates;

  if (
    req.body.address.city &&
    req.body.address.street &&
    req.body.address.buildingNumber
  ) {
    data.startLocation = data.startLocation || {
      type: "Point",
      coordinates: [JSON.parse(longitude), JSON.parse(latitude)],
    };
  }
  const requiredFields = [
    "floor",
    "numberOfRooms",
    "price",
    "totalCapacity",
    "realTimeCapacity",
    "apartmentType",
    "about",
  ];

  const requiredAddressFields = [
    "street",
    "city",
    "country",
    "buildingNumber",
    "apartmentNumber",
    "coordinates.latitude",
    "coordinates.longitude",
  ];

  // Check for top-level required fields
  for (const field of requiredFields) {
    if (!req.body[field]) {
      return next(new AppError(`Field ${field} is required.`, 400));
    }
  }

  // Check for nested address fields
  if (!req.body.address) {
    return next(new AppError("Address field is required.", 400));
  }

  for (const field of requiredAddressFields) {
    const fieldParts = field.split(".");
    let value = req.body.address;

    for (const part of fieldParts) {
      if (value[part] === undefined) {
        return next(
          new AppError(`Field ${field} is required in address.`, 400)
        );
      }
      value = value[part];
    }
  }

  const newApartment = await Apartment.create(data);

  res.status(201).json({
    status: "success",
    data: {
      apartment: newApartment,
    },
  });
});

exports.updateEditedApartment = async (req, res) => {
  try {
    // const { id } = req.params; // Get apartment ID from route params
    // const { userID, action, ...updateData } = req.body; // Destructure userID and action from request body, and store the rest in updateData
    const { id, ...updateData } = req.body; // Destructure userID and action from request body, and store the rest in updateData
    const { latitude, longitude } = req.body.address.coordinates;

    updateData.startLocation = updateData.startLocation || {
      type: "Point",
      coordinates: [parseFloat(longitude), parseFloat(latitude)],
    };

    let apartment = await Apartment.findById(id);

    if (!apartment) {
      return res.status(404).json({
        status: "fail",
        message: "Apartment not found",
      });
    }

    // Update apartment details if updateData is not empty
    if (Object.keys(updateData).length > 0) {
      apartment = await Apartment.findByIdAndUpdate(id, updateData, {
        new: true,
        runValidators: true,
      });
    }

    // Save the updated apartment object
    await apartment.save();

    res.status(200).json({
      status: "success",
      data: {
        apartment,
      },
    });
  } catch (err) {
    res.status(500).json({
      status: "error",
      message: err.message,
    });
  }
};

exports.updateApartment = async (req, res) => {
  try {
    const { id } = req.params; // Get user ID from route params
    const { userID, action } = req.body;
    let user;
    let apartment;
    try {
      apartment = await Apartment.findById(id);
    } catch (err) {
      return res.status(404).json({
        status: "fail",
        message: "apartment not found",
      });
    }
    try {
      user = await User.findById(userID);
    } catch (err) {
      return res.status(404).json({
        status: "fail",
        message: "user not found",
      });
    }

    if (action === "add") {
      const isAlreadyInterested = apartment.interesteds.includes(user._id);
      if (isAlreadyInterested) {
        return res.status(400).json({
          status: "fail",
          message: "user is already interested in this apartment",
        });
      }
      apartment.interesteds.push(user);
    } else if (action === "remove") {
      const isAlreadyInterested = apartment.interesteds.includes(user._id);
      if (isAlreadyInterested) {
        apartment.interesteds = apartment.interesteds.filter(
          (interested) => interested.toString() !== userID
        );
      } else {
        return res.status(400).json({
          status: "fail",
          message: "user is not interested for this apartment",
        });
      }
    } else {
      return res.status(400).json({
        status: "fail",
        message: "Invalid action. Must be 'add' or 'remove'.",
      });
    }

    // Save the updated apartment object
    await apartment.save();

    res.status(200).json({
      status: "success",
      data: {
        user,
      },
    });
  } catch (err) {
    res.status(500).json({
      status: "error",
      message: err.message,
    });
  }
};

exports.isFavourite = async (req, res) => {
  const { apartmentID, userID } = req.params;
  let user;
  let apartment;
  try {
    apartment = await Apartment.findById(apartmentID);
  } catch (err) {
    return res.status(404).json({
      status: "fail",
      message: "apartment not found",
    });
  }
  try {
    user = await User.findById(userID);
  } catch (err) {
    return res.status(404).json({
      status: "fail",
      message: "user not found",
    });
  }

  const isAlreadyInterested = apartment.interesteds.includes(user._id);

  if (isAlreadyInterested) {
    res.status(200).json({
      status: "success",
      data: true,
    });
  } else {
    res.status(200).json({
      status: "success",
      data: false,
    });
  }
};

exports.deleteApartment = async (req, res) => {
  try {
    await Apartment.findByIdAndDelete(req.params.id);

    res.status(204).json({
      status: "success",
      data: null,
    });
  } catch (err) {
    res.status(404).json({
      status: "fail",
      message: err,
    });
  }
};

// api/v1/tours/tours-within/233/center/34.111745,-118.113491/unit/km
exports.getApartmentWithin = catchAsync(async (req, res, next) => {
  const { distance, latlng, unit } = req.params;
  const [lat, lng] = latlng.split(",");

  const radius = unit === "mi" ? distance / 3963.2 : distance / 6378.1;

  if (!lat || !lng) {
    return next(
      new AppError(
        "Please provide latitude and longitude in the format lat,lng",
        400
      )
    );
  }

  const geoFilter = {
    startLocation: { $geoWithin: { $centerSphere: [[lng, lat], radius] } },
  };

  let query = Apartment.find(geoFilter) || Apartment.find();

  const features = new APIFeatures(query, req.query)
    .filter()
    .sort()
    .limitFields()
    .paginate();

  const apartments = await features.query;

  // Send response
  res.status(200).json({
    status: "success",
    results: apartments.length,
    data: {
      apartments,
    },
  });
});

exports.getDistances = catchAsync(async (req, res, next) => {
  // console.log(req.params);
  const { latlng, unit } = req.params;
  const [lat, lng] = latlng.split(",");

  const muliplier = unit === "mi" ? 0.000621371 : 0.001;

  if (!lat || !lng) {
    next(
      new AppError(
        "Please provide latitur and longitude in the format lat,lng",
        400
      )
    );
  }
  const count = await Apartment.countDocuments();
  console.log(`Number of apartments: ${count}`);

  const distances = await Apartment.aggregate([
    {
      $geoNear: {
        near: {
          type: "Point",
          coordinates: [lng * 1, lat * 1],
        },
        distanceField: "distance",
        distanceMultiplier: muliplier,
      },
    },
    {
      $project: {
        distance: 1,
        name: 1,
      },
    },
  ]);

  res.status(200).json({
    status: "success",
    data: {
      data: distances,
    },
  });
});
