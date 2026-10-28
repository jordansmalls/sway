export function pad(str: string, len: number, char = " ") {
    return (str + char.repeat(len)).slice(0, len);
}

export function truncate(str: string, len: number) {
    return str.length > len ? str.slice(0, len - 3) + "..." : str;
}
