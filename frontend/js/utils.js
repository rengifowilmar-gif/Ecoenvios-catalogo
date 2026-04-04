// frontend/js/utils.js
export function abbreviateName(name) {
    const ignoreWords = new Set(['DE', 'EN', 'Y', 'A', 'X', 'UD', 'UDS', 'ML', 'G', 'GR', 'L', 'MTS', 'KG', 'CM', 'UND', 'UN', 'CON', 'POR', 'LA', 'EL', 'LOS', 'LAS']);
    const maxParts = 4;
    const words = name.toUpperCase().split(' ');
    const significantParts = [];

    for (const word of words) {
        if (!word || ignoreWords.has(word) || /^\d+$/.test(word) || /\d/.test(word) && /[A-Z]/.test(word)) {
            continue;
        }
        significantParts.push(word.substring(0, 3));
        if (significantParts.length === maxParts) break;
    }

    if (significantParts.length > 0) {
        return significantParts.join(' ') + '...';
    } else {
        return name.substring(0, 3) + '...';
    }
}
