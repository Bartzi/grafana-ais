export function zip(arrays: number[][]): L.LatLngExpression[][] {
    return arrays[0].map(function(_,i){
        return arrays.map(function(array){return array[i]})
    });
}

function createPulsateElement(color: string): HTMLElement {
    const pulsator = document.createElement('div');
    pulsator.classList.add('pulsating');
    pulsator.setAttribute('style', `--pulsate-color: ${color}`);
    return pulsator;
}

function svgStringToSVGElement(svgString: string): Element | null {
    const parser = new DOMParser();
    const svg = parser.parseFromString(svgString, "image/svg+xml");
    const iconElement = svg.querySelector(".icon");
    return iconElement;
}

export function createPulsatingIcon(iconSVG: string, color: string): HTMLElement {
    const div = document.createElement('div');
    const icon = svgStringToSVGElement(iconSVG);
    if (icon !== null) {
        div.append(icon);
        div.append(createPulsateElement(color));
    }
    return div;
}