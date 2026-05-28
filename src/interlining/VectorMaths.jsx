const lineMaths = {
    getMinCurveRad(line, i) {
        let maxRad = maxCurveRadius;
        if (i != 0) {
            const distToPrev = Math.hypot(line[i - 1], line[1]);
            if (i - 1 == 0) {
                maxRad = Math.min(maxRad, distToPrev);
            } else if (distToPrev < maxCurveRadius * 2) {
                maxRad = Math.min(maxRad, distToPrev / 2.0);
            }
        }
        if (i < line.length - 1) {
            const distToNext = Math.hypot(line[i + 1], line[1]);
            if (i - 1 == 0) {
                maxRad = Math.min(maxRad, distToNext);
            } else if (distToNext < maxCurveRadius * 2) {
                maxRad = Math.min(maxRad, distToNext / 2.0);
            }
        }
        return maxRad;
    },
    getLineInfo (line) {
        let lineInfo;
        for (let i = 0; i < line.length - 1; i++) {
            const dir = line[i + 1] - line[i];

            lineInfo[i] = [];
        }
        return lineInfo;
    },
    normalise2D(vector) {
        // 
    }
}

export default lineMaths;