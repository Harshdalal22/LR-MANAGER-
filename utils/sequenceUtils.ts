export const getNextSequence = (lastVal: string): string => {
    if (!lastVal) return '1';
    
    // Extract the trailing number and any optional prefix
    // This regex ensures we capture all digits at the end of the string
    const match = lastVal.match(/^(.*?)(\d+)$/);
    if (match) {
        const prefix = match[1];
        const numStr = match[2];
        const nextNum = parseInt(numStr, 10) + 1;
        // Keep the exact padding of the numeric part if it started with '0'
        const paddedNextNum = numStr.startsWith('0') 
            ? String(nextNum).padStart(numStr.length, '0')
            : String(nextNum);
        return `${prefix}${paddedNextNum}`;
    }
    
    // If it doesn't end with a number, just append "1"
    return `${lastVal}-1`;
};
