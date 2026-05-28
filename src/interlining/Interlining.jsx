import { useRef, useEffect, useState } from 'react';
import { Bezier } from 'bezier-js';

function Interlining() {
    const canvasRef = useRef(null);
    
    // 1. Spread out the points so they match an 800x800 canvas size better
    const [points, setPoints] = useState([
        { x: 100, y: 100 }, // Start point
        { x: 200, y: 300 }, // Control point 1
        { x: 600, y: 300 }, // Control point 2
        { x: 700, y: 100 }  // End point
    ]);

    const [draggedPointIndex, setDraggedPointIndex] = useState(-1);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const curve = new Bezier(
            points[0].x, points[0].y,
            points[1].x, points[1].y,
            points[2].x, points[2].y,
            points[3].x, points[3].y
        );

        const drawer = {
            drawSkeleton: function(bCurve) {
                const pts = bCurve.points;
                ctx.beginPath();
                ctx.strokeStyle = '#9ca3af'; 
                ctx.lineWidth = 2; // Made thicker for 800x800 resolution
                ctx.setLineDash([8, 8]);
                
                ctx.moveTo(pts[0].x, pts[0].y);
                ctx.lineTo(pts[1].x, pts[1].y);
                ctx.lineTo(pts[2].x, pts[2].y);
                ctx.lineTo(pts[3].x, pts[3].y);
                ctx.stroke();
                ctx.setLineDash([]);

                pts.forEach((p, idx) => {
                    ctx.beginPath();
                    ctx.fillStyle = (idx === 0 || idx === 3) ? '#ef4444' : '#2563eb';
                    ctx.arc(p.x, p.y, 12, 0, 2 * Math.PI); // Increased size to 12px for easier clicking
                    ctx.fill();
                });
            },

            drawCurve: function(bCurve) {
                ctx.beginPath();
                ctx.strokeStyle = '#10b981'; 
                ctx.lineWidth = 6; // Made thicker for 800x800 resolution
                const polyline = bCurve.getLUT(100); 
                ctx.moveTo(polyline[0].x, polyline[0].y);
                for (let i = 1; i < polyline.length; i++) {
                    ctx.lineTo(polyline[i].x, polyline[i].y);
                }
                ctx.stroke();
            }
        };

        drawer.drawSkeleton(curve);
        drawer.drawCurve(curve);
    }, [points]);

    // 2. FIXED: Map mouse position scaling precisely to the internal 800x800 grid
    const getMousePos = (e) => {
        const canvas = canvasRef.current;
        const rect = canvas.getBoundingClientRect();
        
        // Calculate coordinate scale multipliers
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;

        return {
            x: (e.clientX - rect.left) * scaleX,
            y: (e.clientY - rect.top) * scaleY
        };
    };

    const handleMouseDown = (e) => {
        const mouse = getMousePos(e);
        const clickRadius = 24; // Increased click radius to 24px for large canvas scales

        const index = points.findIndex(p => {
            const distance = Math.sqrt((p.x - mouse.x) ** 2 + (p.y - mouse.y) ** 2);
            return distance < clickRadius;
        });

        if (index !== -1) {
            setDraggedPointIndex(index);
        }
    };

    const handleMouseMove = (e) => {
        if (draggedPointIndex === -1) return;

        const mouse = getMousePos(e);
        
        setPoints(prevPoints => {
            const updated = [...prevPoints];
            updated[draggedPointIndex] = { x: mouse.x, y: mouse.y };
            return updated;
        });
    };

    const handleMouseUpOrLeave = () => {
        setDraggedPointIndex(-1);
    };

    return (
        <>
            <div className="p-4">
                <h1 className="text-xl font-bold">Interlining Demo</h1>
                <p className="text-gray-600 mb-2">
                    Drag the red and blue dots to reshape the curve!
                </p>
            </div>
            {/* Added max-w-full to allow responsive sizing layout wrappers */}
            <canvas 
                ref={canvasRef}
                id="interlining-canvas" 
                width={800}
                height={400}
                className="bg-gray-200 block touch-none max-w-full h-auto"
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUpOrLeave}
                onMouseLeave={handleMouseUpOrLeave}
            />
        </>
    );
}

export default Interlining;
