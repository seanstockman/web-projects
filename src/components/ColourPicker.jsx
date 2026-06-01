import {useState} from "react";

export function SimpleColourPicker() {
    const [colour, setColour] = useState('#0080ff');

    return(<div>
        <input
            type="color"
            value={colour}
            onChange={(e) => setColour(e.target.value)}
        />
    </div>);
}