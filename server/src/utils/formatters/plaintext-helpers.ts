export function pad(str, len, char = " ") {
    return (str + char.repeat(len)).slice(0, len);
}

export function truncate(str, len) {
    return str.length > len ? str.slice(0, len - 3) + "..." : str;
}
