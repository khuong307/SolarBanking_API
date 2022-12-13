import * as dotenv from 'dotenv';
import nodemailer from 'nodemailer';

dotenv.config();

export default function(userEmail, subject, message) {
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.username_email,
            pass: process.env.password_email
        }
    });

    const mailOptions = {
        from: 'Solar Banking',
        to: userEmail,
        subject,
        text: message
    };

    transporter.sendMail(mailOptions, function(error, info){
        if (error) {
            console.log(error);
        } else {
            console.log('Email sent: ' + info.response);
        }
    });
}