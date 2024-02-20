export function zip(arrays: number[][]): L.LatLngExpression[][] {
    return arrays[0].map(function(_,i){
        return arrays.map(function(array){return array[i]})
    });
}