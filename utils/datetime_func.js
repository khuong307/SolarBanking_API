export default {
    convertStringToDate(str){
        return new Date(Date.parse(str))
    },

    diff_minutes(dt2, dt1) {
        var diff = (dt2.getTime() - dt1.getTime()) / 1000
        diff /= 60
        return Math.abs(Math.round(diff))
    },

    diff_hours(dt2, dt1) {
        var diff = (dt2.getTime() - dt1.getTime()) / 1000;
        diff /= (60 * 60);
        return Math.abs(Math.round(diff));
    }
}