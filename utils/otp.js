export default function() {
    const DIGITS = '0123456789';
    let otp = '';

    for (let i = 1; i <= 6; i++) {
        otp += DIGITS[Math.floor(Math.random() * 10)];
    }

    return otp;
}