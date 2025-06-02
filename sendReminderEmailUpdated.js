const { Firestore } = require('@google-cloud/firestore');
const nodemailer = require('nodemailer');

const firestore = new Firestore();

exports.sendReminderEmail = async (req, res) => {
  const now = new Date().toISOString();

  try {
    const snapshot = await firestore.collection('appointments')
      .where('reminderTimeUTC', '<=', now)
      .where('reminderSent', '==', false)
      .get();

    if (snapshot.empty) {
      res.status(200).send('No reminders to send.');
      return;
    }

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: 'tarunyadav.3050@gmail.com',
        pass: process.env.GMAIL_APP_PASSWORD,
      },
    });

    const sendPromises = [];

    snapshot.forEach(doc => {
      const data = doc.data();
      const slotTime = new Date(data.appointmentTimeUTC).toLocaleString('en-IN', {
        dateStyle: 'full',
        timeStyle: 'short',
        timeZone: 'Asia/Kolkata',
      });

      const mailOptions = {
        from: 'tarunyadav.3050@gmail.com',
        to: 'yadav.tarun21@gmail.com', // You can make this dynamic later
        subject: 'Appointment Reminder',
        text: `Reminder: Your appointment with Dr. ${data.doctor} is in 1 hour at ${slotTime}.`,
      };

      sendPromises.push(
        transporter.sendMail(mailOptions).then(() =>
          doc.ref.update({ reminderSent: true })
        )
      );
    });

    await Promise.all(sendPromises);
    res.status(200).send('Reminders sent successfully.');
  }
catch (error) {
 console.error('Reminder email error:', error);
 res.status(500).send(`Failed to send reminder emails. Error: ${error.message}`);
}

};
// This code defines a function to send reminder emails for appointments stored in Firestore.
// It checks for appointments that are due for reminders, sends emails, and updates the database to mark reminders as sent.
// The function uses nodemailer to send emails and Firestore to manage appointment data.
