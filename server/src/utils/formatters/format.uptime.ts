/**
 * @desc Converts total seconds into a detailed time object (D:H:M:S).
 * @param {number} totalSeconds - The number of seconds returned by process.uptime().
 * @returns {object} - An object with keys for days, hours, minutes, and seconds.
 */
const formatUptime = (totalSeconds) => {
    const days = Math.floor(totalSeconds / (3600 * 24));
    const hours = Math.floor((totalSeconds % (3600 * 24)) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = Math.floor(totalSeconds % 60);

    return {
        days: days,
        hours: hours,
        minutes: minutes,
        seconds: seconds,
    };
};

export default formatUptime;
