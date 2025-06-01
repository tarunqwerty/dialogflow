const nodemailer = require('nodemailer');

// Helper function to convert slot to readable date/time
function convertSlotToDateTimeString(slot) {
  if (typeof slot === 'string') {
    // Append IST offset if not already present
    const slotWithOffset = slot.includes('+') ? slot : `${slot}+05:30`;
    return new Date(slotWithOffset).toLocaleString('en-IN', {
      dateStyle: 'full',
      timeStyle: 'short',
    });
  }

  if (typeof slot === 'object' && slot.year && slot.month && slot.day) {
    const date = new Date(
      slot.year,
      slot.month - 1, // JS months are 0-based
      slot.day,
      slot.hours || 0,
      slot.minutes || 0,
      slot.seconds || 0
    );
    return date.toLocaleString('en-IN', {
      dateStyle: 'full',
      timeStyle: 'short',
    });
  }

  return '[Invalid time]';
}

exports.sendAppointmentEmail = async (req, res) => {
  const doctor = req.body?.sessionInfo?.parameters?.doctor;
  const slot = req.body?.sessionInfo?.parameters?.slot;

  if (!doctor || !slot) {
    res.status(400).send('Missing doctor or slot information');
    return;
  }

  const slotTime = convertSlotToDateTimeString(slot);

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: 'tarunyadav.3050@gmail.com',
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  });

  const mailOptions = {
    from: 'tarunyadav.3050@gmail.com',
    to: 'yadav.tarun21@gmail.com', // Replace with actual recipient
    subject: 'Doctor Appointment Confirmation',
    text: `Your appointment with ${doctor} is confirmed for ${slotTime}.`,
  };

  try {
    await transporter.sendMail(mailOptions);
    res.status(200).send({
      fulfillment_response: {
        messages: [{ text: { text: ['Email sent successfully.'] } }],
      },
    });
  } catch (error) {
    console.error('Email error:', error);
    res.status(500).send({
      fulfillment_response: {
        messages: [{ text: { text: ['Failed to send email.'] } }],
      },
    });
  }
};
