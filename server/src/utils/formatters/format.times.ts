function formatTo12HourTime(dateString) {
    const date = new Date(dateString);

    // Options for formatting
    const options = {
        hour: "numeric", // e.g., '1'
        minute: "2-digit", // e.g., '01'
        hour12: true, // Forces 12-hour format
        // Optional: Specify a time zone if you want to display it for a specific place
        // timeZone: 'America/New_York',
    };

    // Use the user's default locale (or specify one like 'en-US')
    return date.toLocaleTimeString(undefined, options);
}

function formatToFullDate12Hour(dateString) {
    const date = new Date(dateString);

    // Options for formatting the full date and time
    const options = {
        weekday: "short", // e.g., 'Mon'
        year: "numeric",
        month: "short", // e.g., 'Sep'
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
        hour12: true, // Forces 12-hour format
        // The user's time zone is used by default.
    };

    // Use toLocaleString for a combined date and time string
    // 'en-US' is used here for a common format, but 'undefined' uses the user's default locale.
    return date.toLocaleString("en-US", options);
}

export { formatTo12HourTime, formatToFullDate12Hour };
