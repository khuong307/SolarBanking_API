export function filterArray(array, offset, limit){
    if (offset && limit) {
        return array.slice(offset, offset + limit);
    } else if (offset) {
        return array.slice(offset);
    } else if (limit) {
        return array.slice(0, limit);
    }
}