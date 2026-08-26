const ContactMessage = require('../models/contact-message.model');
const catchAsync = require('../utils/catch-async.util');
const AppError = require('../utils/app-error');

exports.createContactMessage = catchAsync(async (req, res) => {
  const contactMessage = await ContactMessage.create({
    firstName: req.body.firstName,
    lastName: req.body.lastName,
    phone: req.body.phone,
    email: req.body.email,
    message: req.body.message,
  });

  res.status(201).json({
    message: 'Your message has been sent successfully.',
    data: contactMessage,
  });
});

exports.getContactMessages = catchAsync(async (req, res) => {
  const search = String(req.query.search || '').trim();
  const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const filter = search
    ? {
        $or: [
          { firstName: { $regex: escapedSearch, $options: 'i' } },
          { lastName: { $regex: escapedSearch, $options: 'i' } },
          { email: { $regex: escapedSearch, $options: 'i' } },
        ],
      }
    : {};
  const messages = await ContactMessage.find(filter).sort({ createdAt: -1 }).lean();

  res.status(200).json({
    message: 'Contact messages retrieved successfully.',
    data: messages,
  });
});

exports.deleteContactMessage = catchAsync(async (req, res, next) => {
  const contactMessage = await ContactMessage.findByIdAndDelete(req.params.id);
  if (!contactMessage) {
    return next(new AppError('Contact message not found', 404));
  }

  res.status(200).json({ message: 'Contact message deleted successfully.' });
});
