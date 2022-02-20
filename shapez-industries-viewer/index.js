/*
 * Lots of code here is copied 1:1 from actual game files
 *
 */

const maxLayer = 4;

/** @enum {string} */
const enumSubShape = {
	rect: "rect",
	circle: "circle",
	star: "star",
	windmill: "windmill",
	circlestar: "circlestar",
	rectcircle: "rectcircle",
	starrect: "starrect",
	circlewindmill: "circlewindmill",
	rectwindmill: "rectwindmill",
	starwindmill: "starwindmill",
};

/** @enum {string} */
const enumSubShapeToShortcode = {
	[enumSubShape.rect]: "R",
	[enumSubShape.circle]: "C",
	[enumSubShape.star]: "S",
	[enumSubShape.windmill]: "W",
	[enumSubShape.circlestar]: "1",
	[enumSubShape.rectcircle]: "2",
	[enumSubShape.starrect]: "3",
	[enumSubShape.circlewindmill]: "4",
	[enumSubShape.rectwindmill]: "5",
	[enumSubShape.starwindmill]: "6",
};

/** @enum {enumSubShape} */
const enumShortcodeToSubShape = {};
for (const key in enumSubShapeToShortcode) {
	enumShortcodeToSubShape[enumSubShapeToShortcode[key]] = key;
}

const arrayQuadrantIndexToOffset = [
	{ x: 1, y: -1 }, // tr
	{ x: 1, y: 1 }, // br
	{ x: -1, y: 1 }, // bl
	{ x: -1, y: -1 }, // tl
];

// From colors.js
/** @enum {string} */
const enumColors = {
	red: "red",
	green: "green",
	blue: "blue",

	yellow: "yellow",
	purple: "purple",
	cyan: "cyan",

	white: "white",
	uncolored: "uncolored",
};

/** @enum {string} */
const enumColorToShortcode = {
	[enumColors.red]: "r",
	[enumColors.green]: "g",
	[enumColors.blue]: "b",

	[enumColors.yellow]: "y",
	[enumColors.purple]: "p",
	[enumColors.cyan]: "c",

	[enumColors.white]: "w",
	[enumColors.uncolored]: "u",
};

/** @enum {string} */
const enumColorsToHexCode = {
	[enumColors.red]: "#ff666a",
	[enumColors.green]: "#78ff66",
	[enumColors.blue]: "#66a7ff",

	// red + green
	[enumColors.yellow]: "#fcf52a",

	// red + blue
	[enumColors.purple]: "#dd66ff",

	// blue + green
	[enumColors.cyan]: "#87fff5",

	// blue + green + red
	[enumColors.white]: "#ffffff",

	[enumColors.uncolored]: "#aaaaaa",
};

/** @enum {enumColors} */
const enumShortcodeToColor = {};
for (const key in enumColorToShortcode) {
	enumShortcodeToColor[enumColorToShortcode[key]] = key;
}

CanvasRenderingContext2D.prototype.beginCircle = function (x, y, r) {
	if (r < 0.05) {
		this.beginPath();
		this.rect(x, y, 1, 1);
		return;
	}
	this.beginPath();
	this.arc(x, y, r, 0, 2.0 * Math.PI);
};

/////////////////////////////////////////////////////

function radians(degrees) {
	return (degrees * Math.PI) / 180.0;
}

/**
 * Generates the definition from the given short key
 */
function fromShortKey(key) {
	const sourceLayers = key.split(":");
	if (sourceLayers.length > maxLayer) {
		throw new Error("Only " + maxLayer + " layers allowed");
	}
	let layers = [];
	for (let i = 0; i < sourceLayers.length; ++i) {
		const text = sourceLayers[i];
		if (text.length !== 8) {
			throw new Error(
				"Invalid layer: '" + text + "' -> must be 8 characters"
			);
		}

		if (text === "--".repeat(4)) {
			throw new Error("Empty layers are not allowed");
		}

		/** @type {ShapeLayer} */
		const items = [];

		let linkedShapes = 1;

		// add initial
		for (let i = 0; i < 4; ++i) {
			const shapeText = text[i * 2 + 0];
			const colorText = text[i * 2 + 1];

			if (shapeText == "-") {
				// it's nothing
				if (colorText != "-") {
					throw new Error("Shape is null but not color");
				}
				items.push(null);
				continue;
			}

			const subShape = enumShortcodeToSubShape[shapeText];
			const color = enumShortcodeToColor[colorText];

			if (colorText == "_") {
				//it's linked
				items.push({
					linkedBefore: true,
					subShape: subShape || null,
					color: null,
				});
				linkedShapes++;
			} else if (subShape) {
				if (!color) {
					throw new Error("Invalid color");
				}
				items.push({
					subShape,
					color,
				});
			} else {
				throw new Error("Invalid shape key: " + shapeText);
			}
		}

		// now loop through items to complete links
		for (let itemIndex = 0; itemIndex < 4; ++itemIndex) {
			const item = items[itemIndex];
			const lastItem = items[(itemIndex + 3) % 4];

			let lastFullItem;
			for (let i = 1; i < 4; i++) {
				const fullItem = items[(itemIndex + 4 - i) % 4];
				if (fullItem && !fullItem.linkedBefore) {
					lastFullItem = fullItem;
					break;
				}
			}

			if (item && item.linkedBefore) {
				if (!lastItem || !lastFullItem) {
					throw new Error(
						"Item is linked but there is nothing before"
					);
				}
				lastItem.linkedAfter = true;
				item.color = lastFullItem.color;
				if (!item.subShape) {
					item.subShape = lastFullItem.subShape;
				}
			}
		}

		if (linkedShapes > 3) {
			// we are linked all the way round
			for (let i = 0; i < items.length; i++) {
				items[i].linkedBefore = true;
				items[i].linkedAfter = true;
			}
		}
		layers.push(items);
	}

	return layers;
}

function renderShape(layers) {
	const canvas = /** @type {HTMLCanvasElement} */ (
		document.getElementById("result")
	);
	const context = canvas.getContext("2d");

	context.save();
	context.clearRect(0, 0, 1000, 1000);

	const w = 512;
	const h = 512;
	const dpi = 1;

	context.translate((w * dpi) / 2, (h * dpi) / 2);
	context.scale((dpi * w) / 23, (dpi * h) / 23);

    const quadrantSize = 10;
    
  context.fillStyle = "rgba(40, 50, 65, 0.1)";
  context.beginCircle(0, 0, quadrantSize * 1.15);
  context.fill();

	// this is the important part
	for (let layerIndex = 0; layerIndex < layers.length; ++layerIndex) {
		let rotation = 0;

		const layer = layers[layerIndex];

		const layerScale = Math.max(0.1, 0.9 - layerIndex * 0.22);
		const dims = quadrantSize * layerScale;

		let pathActive = false;
		for (let index = 0; index < layer.length; ++index) {
			const item = layer[index];
			if (!item) {
				// this quadrant is empty
				rotation += 90;
                context.rotate(radians(90));
				continue;
			}

			const { linkedBefore, linkedAfter, subShape, color } = item;

			if (!pathActive) {
				context.beginPath();
				pathActive = true;
			}

			context.strokeStyle = "#555";
			context.lineWidth = 1;
			context.fillStyle = enumColorsToHexCode[color];

			if (!linkedBefore) {
				context.moveTo(0, 0);
			}

            drawOuterSubShape(context, dims, subShape);

			if (linkedAfter) {
				//
			} else {
				// we have no linked item
				context.lineTo(0, 0);
				context.fill();
				context.stroke();
				context.closePath();
				pathActive = false;
			}
			// rotate at the end
			rotation += 90;
            context.rotate(radians(90));
		}

		if (pathActive) {
			context.fill();
			context.stroke();

			// outline the first shape once more to fill the gap
			this.drawOuterSubShape(context, dims, layer[0].subShape);
			context.stroke();
			context.closePath();
		}

		// reset rotation for next layer
            context.rotate(radians(-rotation));
	}

	context.restore();
}

function drawOuterSubShape(context, dims, subShape) {
	switch (subShape) {
		case enumSubShape.rect: {
			context.lineTo(0, -dims);
			context.lineTo(dims, -dims);
			context.lineTo(dims, 0);
			break;
		}
		case enumSubShape.star: {
			const moveInwards = dims * 0.4;
			context.lineTo(0, -dims + moveInwards);
			context.lineTo(dims, -dims);
			context.lineTo(dims - moveInwards, 0);
			break;
		}
		case enumSubShape.windmill: {
			const moveInwards = dims * 0.4;
			context.lineTo(0, -dims + moveInwards);
			context.lineTo(dims, -dims);
			context.lineTo(dims, 0);
			break;
		}
		case enumSubShape.circle: {
			context.lineTo(0, -dims);
			context.arcTo(dims, -dims, dims, 0, dims);
			break;
		}

		case enumSubShape.circlestar: {
			const moveInwards = dims * 0.1;
			const starPosition = dims * 0.55;
			context.lineTo(0, -dims);
			context.arc(0, 0, dims, -Math.PI * 0.5, -Math.PI * 0.35);
			context.lineTo(dims, -dims);
			context.lineTo(dims - moveInwards, -dims + starPosition);
			context.arc(0, 0, dims, -Math.PI * 0.13, 0);
		}
		case enumSubShape.rectcircle: {
			const moveInwards = dims * 0.3;

			context.lineTo(0, -dims);
			context.lineTo(moveInwards, -dims);
			context.arc(
				moveInwards,
				-moveInwards,
				dims - moveInwards,
				-Math.PI * 0.5,
				0
			);
			context.lineTo(dims, 0);
		}
		case enumSubShape.starrect: {
			const moveInwards = 0.05;
			context.lineTo(0, -dims);
			context.lineTo(moveInwards, -dims);
			context.lineTo(dims, -moveInwards);
			context.lineTo(dims, 0);
		}
		case enumSubShape.circlewindmill: {
			const moveInwards = dims * 0.5;
			context.lineTo(0, -moveInwards);
			context.lineTo(moveInwards, -dims);
			context.arcTo(dims, -dims, dims, -moveInwards, moveInwards);
			context.lineTo(dims, 0);
		}
		case enumSubShape.rectwindmill: {
			const moveInwards = dims * 0.5;
			context.lineTo(0, -moveInwards);
			context.lineTo(moveInwards, -dims);
			context.arcTo(dims, -dims, dims, -moveInwards, moveInwards);
			context.lineTo(dims, 0);
		}
		case enumSubShape.starwindmill: {
			const moveInwards = dims * 0.6;
			context.lineTo(0, -moveInwards);
			context.lineTo(dims, -dims * 0.01);
			context.lineTo(dims, 0);
		}

		default: {
			throw new Error("Unkown sub shape: " + subShape);
		}
	}
}

/////////////////////////////////////////////////////

function showError(msg) {
	const errorDiv = document.getElementById("error");
	errorDiv.classList.toggle("hasError", !!msg);
	if (msg) {
		errorDiv.innerText = msg;
	} else {
		errorDiv.innerText = "Shape generated";
	}
}

// @ts-ignore
window.generate = () => {
	showError(null);
	// @ts-ignore
	const code = document.getElementById("code").value.trim();

	let parsed = null;
	try {
		parsed = fromShortKey(code);
	} catch (ex) {
		showError(ex);
		return;
	}

	renderShape(parsed);
};

// @ts-ignore
window.debounce = (fn) => {
	setTimeout(fn, 0);
};

// @ts-ignore
window.addEventListener("load", () => {
	if (window.location.search) {
		const key = window.location.search.substr(1);
		document.getElementById("code").value = key;
	}
	generate();
});

window.exportShape = () => {
	const canvas = document.getElementById("result");
	const imageURL = canvas.toDataURL("image/png");

	const dummyLink = document.createElement("a");
	dummyLink.download = "shape.png";
	dummyLink.href = imageURL;
	dummyLink.dataset.downloadurl = [
		"image/png",
		dummyLink.download,
		dummyLink.href,
	].join(":");

	document.body.appendChild(dummyLink);
	dummyLink.click();
	document.body.removeChild(dummyLink);
};

window.viewShape = (key) => {
	document.getElementById("code").value = key;
	generate();
};

window.shareShape = () => {
	const code = document.getElementById("code").value.trim();
	const url = "https://sense101.github.io/shapez-industries-viewer?" + code;
	alert("You can share this url: " + url);
};

function getRandomInt(max) {
	return Math.floor(Math.random() * Math.floor(max));
}

function getRandomShape() {
	let shapes = Object.values(enumSubShapeToShortcode);
	shapes.push("-");
	return shapes[getRandomInt(shapes.length)];
}

function getRandomColor() {
	return Object.values(enumColorToShortcode)[
		getRandomInt(Object.keys(enumColorToShortcode).length)
	];
}

window.randomShape = () => {
	let layers = getRandomInt(maxLayer);
	let code = "";
	for (var i = 0; i <= layers; i++) {
		let layertext = "";
		for (var y = 0; y <= 3; y++) {
			let randomShape = getRandomShape();
			let randomColor = getRandomColor();

			if (randomShape === "-") {
				randomColor = "-";
				console.log("in");
			}
			layertext = layertext + randomShape + randomColor;
		}
		//empty layer not allowed
		if (layertext === "--------") {
			i--;
		} else {
			code = code + layertext + ":";
		}
	}
	code = code.replace(/:+$/, "");
	document.getElementById("code").value = code;
	generate();
};
