import React, { useState, useEffect, createContext, useContext } from 'react';
import barbellOutlineSvg from './assets/barbell-outline.svg'

// --- [1] LOCAL STORAGE-BASED INVENTORY ---
// All data is handled through React context and saved to the browser's localStorage.

const InventoryContext = createContext();

// Default data for first-time users.
const defaultPlates = [
    { id: crypto.randomUUID(), weight: 45, quantity: 12, color: '#F97316' }, // Orange
    { id: crypto.randomUUID(), weight: 25, quantity: 4, color: '#3B82F6' },  // Blue
    { id: crypto.randomUUID(), weight: 10, quantity: 6, color: '#FBBF24' },  // Yellow
    { id: crypto.randomUUID(), weight: 5, quantity: 6, color: '#10B981' },   // Green
    { id: crypto.randomUUID(), weight: 2.5, quantity: 6, color: '#6B7280' },// Gray
];

const defaultBars = [
    { id: crypto.randomUUID(), name: 'Standard Barbell', weight: 45, unit: 'lbs' },
    { id: crypto.randomUUID(), name: 'EZ Curl Bar', weight: 10, unit: 'lbs' },
    { id: crypto.randomUUID(), name: 'Dumbbell Bar', weight: 5, unit: 'lbs' },
    { id: 'no-bar', name: 'No Bar', weight: 0, unit: 'lbs' },
];

export const InventoryProvider = ({ children }) => {
    const [plates, setPlates] = useState([]);
    const [bars, setBars] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    // Load initial data from localStorage or seed with defaults.
    useEffect(() => {
        try {
            const storedPlates = localStorage.getItem('barbell-calculator-plates');
            const storedBars = localStorage.getItem('barbell-calculator-bars');

            if (storedPlates && storedBars) {
                setPlates(JSON.parse(storedPlates));
                setBars(JSON.parse(storedBars));
            } else {
                // First time setup
                setPlates(defaultPlates);
                setBars(defaultBars);
                localStorage.setItem('barbell-calculator-plates', JSON.stringify(defaultPlates));
                localStorage.setItem('barbell-calculator-bars', JSON.stringify(defaultBars));
            }
        } catch (error) {
            console.error("Failed to load inventory from localStorage:", error);
            setPlates(defaultPlates);
            setBars(defaultBars);
        }
        setIsLoading(false);
    }, []);

    // Persist data to localStorage whenever it changes.
    useEffect(() => {
        if (!isLoading) {
            localStorage.setItem('barbell-calculator-plates', JSON.stringify(plates));
        }
    }, [plates, isLoading]);

    useEffect(() => {
        if (!isLoading) {
            localStorage.setItem('barbell-calculator-bars', JSON.stringify(bars));
        }
    }, [bars, isLoading]);

    // --- CRUD Functions for Inventory ---
    const addItem = (type, itemData) => {
        const newItem = { ...itemData, id: crypto.randomUUID() };
        const setter = type === 'plates' ? setPlates : setBars;
        setter(prev => [...prev, newItem].sort((a, b) => b.weight - a.weight));
    };

    const updateItem = (type, id, itemData) => {
        const setter = type === 'plates' ? setPlates : setBars;
        setter(prev => prev.map(item => (item.id === id ? { ...item, ...itemData } : item)).sort((a, b) => b.weight - a.weight));
    };

    const deleteItem = (type, id) => {
        const setter = type === 'plates' ? setPlates : setBars;
        setter(prev => prev.filter(item => item.id !== id));
    };

    const value = { plates, bars, addItem, updateItem, deleteItem, isLoading };

    return <InventoryContext.Provider value={value}>{children}</InventoryContext.Provider>;
};


// --- [2] HELPER & CORE UI COMPONENTS ---

const Modal = ({ isOpen, onClose, title, children }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4">
            <div className="bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md m-4">
                <div className="flex justify-between items-center p-5 border-b border-gray-700">
                    <h3 className="text-xl font-bold text-white">{title}</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                    </button>
                </div>
                <div className="p-6">{children}</div>
            </div>
        </div>
    );
};

const ConfirmationModal = ({ isOpen, onClose, onConfirm, title, message }) => {
    if (!isOpen) return null;
    return (
        <Modal isOpen={isOpen} onClose={onClose} title={title}>
            <p className="text-white mb-6">{message}</p>
            <div className="flex justify-end gap-3">
                <button onClick={onClose} className="bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded-lg transition">Cancel</button>
                <button onClick={onConfirm} className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg transition">Confirm</button>
            </div>
        </Modal>
    );
};

const Spinner = () => (
    <div className="flex justify-center items-center h-full p-8">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500"></div>
    </div>
);

// Helper function to handle unit conversion for display
const convertWeight = (weight, unit, baseUnit = 'lbs') => {
    const lbsToKg = 0.453592;
    if (unit === 'kg' && baseUnit === 'lbs') return weight * lbsToKg;
    if (unit === 'lbs' && baseUnit === 'kg') return weight / lbsToKg;
    return weight;
};

const roundToDecimal = (value, decimals) => {
    return Number(Math.round(value + 'e' + decimals) + 'e-' + decimals);
};

// --- VISUALIZER ---
const BarbellVisualizer = ({ bar, platesOnBar, calculationType, unit }) => {
    const VIEW_HEIGHT = 110;
    const PLATE_WIDTH = 14;
    const PLATE_SPACING = 2;
    const BAR_SHAFT_HEIGHT = 10;
    const BAR_COLLAR_WIDTH = 6;
    const BAR_COLLAR_HEIGHT = 20;
    const MAX_BAR_SHAFT_LENGTH = 150;
    const MIN_BAR_SHAFT_LENGTH = 40;

    const SLEEVE_LENGTH = 5 * (PLATE_WIDTH + PLATE_SPACING); // 5 plates thick
    const SLEEVE_HEIGHT = 15; // Thicker than BAR_SHAFT_HEIGHT

    const isNoBar = bar.id === 'no-bar';

    const getBarShaftLength = () => {
        if (isNoBar) return MIN_BAR_SHAFT_LENGTH;
        if (bar.weight >= 45) return MAX_BAR_SHAFT_LENGTH;
        if (bar.weight <= 5) return MIN_BAR_SHAFT_LENGTH;
        const weightRatio = ((bar.weight - 5) / (45 - 5));
        return MIN_BAR_SHAFT_LENGTH + (MAX_BAR_SHAFT_LENGTH - MIN_BAR_SHAFT_LENGTH) * weightRatio;
    };

    const barShaftLength = getBarShaftLength();

    // Sort plates for display
    const platesAsc = [...platesOnBar].sort((a, b) => a.weight - b.weight); // Smallest to largest
    const platesDesc = [...platesOnBar].sort((a, b) => b.weight - a.weight); // Largest to smallest

    // Get display height with min/max scaling
    const getPlateDisplayHeight = (plate) => {
        const maxWeight = 45; // Max weight for scaling
        const minWeight = 2.5; // Min weight for scaling
        const maxHeight = 100; // Max height for 45lb plates
        const minHeight = 35; // Min height for 2.5lb plates

        if (plate.weight >= maxWeight) return maxHeight;
        if (plate.weight <= minWeight) return minHeight;

        // Linear interpolation for plates between min and max weight
        const weightRatio = (plate.weight - minWeight) / (maxWeight - minWeight);
        return minHeight + (maxHeight - minHeight) * weightRatio;
    };

    const renderPlateStack = (plates) => {
        let offset = 0;
        return plates.map((plate, index) => {
            const displayHeight = getPlateDisplayHeight(plate);
            const xPos = offset;
            offset += PLATE_WIDTH + PLATE_SPACING;
            const textX = PLATE_WIDTH / 2;
            const textY = VIEW_HEIGHT / 2 + 4;

            return (
                <g key={`${plate.id}-${index}`} transform={`translate(${xPos}, 0)`}>
                    <rect y={(VIEW_HEIGHT - displayHeight) / 2} width={PLATE_WIDTH} height={displayHeight} fill={plate.color} rx="2" />
                    <text 
                        x={textX} 
                        y={textY} 
                        fontSize="10" 
                        fill="white" 
                        textAnchor="middle" 
                        className="font-bold"
                        style={{ textShadow: '1px 1px 2px black' }}
                    >
                        {convertWeight(plate.weight, unit)}
                    </text>
                </g>
            );
        });
    };

    // Calculate effective plate widths
    const effectiveLeftPlatesWidth = platesAsc.reduce((acc) => acc + PLATE_WIDTH + PLATE_SPACING, 0);
    const effectiveRightPlatesWidth = platesDesc.reduce((acc) => acc + PLATE_WIDTH + PLATE_SPACING, 0);

    // Calculate effective sleeve lengths (min 5 plates thick, or more if plates require)
    const effectiveLeftSleeveLength = Math.max(SLEEVE_LENGTH, effectiveLeftPlatesWidth);
    const effectiveRightSleeveLength = Math.max(SLEEVE_LENGTH, effectiveRightPlatesWidth);

    // Calculate the total width of the bar and its sleeves/collars, accounting for plate overflow
    const totalContentWidth = effectiveLeftSleeveLength + BAR_COLLAR_WIDTH + barShaftLength + BAR_COLLAR_WIDTH + effectiveRightSleeveLength;
    const viewboxWidth = Math.max(totalContentWidth, 300);
    const xOffset = (viewboxWidth - totalContentWidth) / 2;

    // X positions for the main bar components
    const leftSleeveX = 0;
    const leftCollarX = effectiveLeftSleeveLength;
    const barShaftX = effectiveLeftSleeveLength + BAR_COLLAR_WIDTH;
    const rightCollarX = effectiveLeftSleeveLength + BAR_COLLAR_WIDTH + barShaftLength;
    const rightSleeveX = effectiveLeftSleeveLength + BAR_COLLAR_WIDTH + barShaftLength + BAR_COLLAR_WIDTH;

    return (
        <div className="w-full bg-gray-800 p-4 rounded-xl my-4 overflow-x-auto">
            <svg width="100%" height={VIEW_HEIGHT} viewBox={`0 0 ${viewboxWidth} ${VIEW_HEIGHT}`} className="min-w-[300px]">
              <g transform={`translate(${xOffset}, 0)`}>
                {/* Left Sleeve */}
                <rect x={leftSleeveX} y={(VIEW_HEIGHT - SLEEVE_HEIGHT) / 2} width={effectiveLeftSleeveLength} height={SLEEVE_HEIGHT}
                          fill={isNoBar ? 'transparent' : '#4B5563'} stroke={isNoBar ? '#6B7280' : 'transparent'} strokeDasharray={isNoBar ? '4 2' : 'none'} rx="2" />

                {/* Left Side Plates (Two-Sided Mode Only) */}
                {calculationType === 'two-sided' && (
                    <g transform={`translate(${leftCollarX - effectiveLeftPlatesWidth}, 0)`}> 
                        {renderPlateStack(platesAsc)}
                    </g>
                )}

                {/* Left Collar */}
                <rect x={leftCollarX} y={(VIEW_HEIGHT - BAR_COLLAR_HEIGHT) / 2} width={BAR_COLLAR_WIDTH} height={BAR_COLLAR_HEIGHT}
                          fill={isNoBar ? 'transparent' : '#6B7280'} stroke={isNoBar ? '#6B7280' : 'transparent'} strokeDasharray={isNoBar ? '4 2' : 'none'} rx="2" />

                {/* Bar Shaft */}
                <rect x={barShaftX} y={(VIEW_HEIGHT - BAR_SHAFT_HEIGHT) / 2} width={barShaftLength} height={BAR_SHAFT_HEIGHT}
                          fill={isNoBar ? 'transparent' : '#9CA3AF'} stroke={isNoBar ? '#6B7280' : 'transparent'} strokeDasharray={isNoBar ? '4 2' : 'none'} />

                {/* Right Collar */}
                <rect x={rightCollarX} y={(VIEW_HEIGHT - BAR_COLLAR_HEIGHT) / 2} width={BAR_COLLAR_WIDTH} height={BAR_COLLAR_HEIGHT}
                          fill={isNoBar ? 'transparent' : '#6B7280'} stroke={isNoBar ? '#6B7280' : 'transparent'} strokeDasharray={isNoBar ? '4 2' : 'none'} rx="2" />

                {/* Right Sleeve */}
                <rect x={rightSleeveX} y={(VIEW_HEIGHT - SLEEVE_HEIGHT) / 2} width={effectiveRightSleeveLength} height={SLEEVE_HEIGHT}
                          fill={isNoBar ? 'transparent' : '#4B5563'} stroke={isNoBar ? '#6B7280' : 'transparent'} strokeDasharray={isNoBar ? '4 2' : 'none'} rx="2" />

                {/* Right Side Plates */}
                <g transform={`translate(${rightSleeveX}, 0)`}>
                    {renderPlateStack(platesDesc)}
                </g>
              </g>
            </svg>
        </div>
    );
};


// --- [3] PAGE COMPONENTS ---

const CalculatorPage = ({ unit, targetWeight, setTargetWeight }) => {
    const { plates, bars, isLoading } = useContext(InventoryContext);
    const [selectedBarId, setSelectedBarId] = useState('');
    const [calculationType, setCalculationType] = useState('two-sided');
    const [result, setResult] = useState({ plates: [], message: '' });

    useEffect(() => {
        if (bars.length > 0 && !selectedBarId) {
            const defaultBar = bars.find(b => b.weight === 45) || bars[0];
            setSelectedBarId(defaultBar.id);
        }
    }, [bars, selectedBarId]);

    useEffect(() => {
        if (isLoading || !selectedBarId) {
            setResult({ plates: [], message: 'Loading inventory...' }); return;
        }

        const bar = bars.find(b => b.id === selectedBarId);
        if (!bar) {
            setResult({ plates: [], message: 'Please select a bar.' }); return;
        }

        let targetInLbs = parseFloat(targetWeight);
        if (unit === 'kg') targetInLbs = convertWeight(targetInLbs, 'lbs', 'kg');

        if (isNaN(targetInLbs) || targetInLbs < 0) {
            setResult({ plates: [], message: 'Enter a valid target weight.' }); return;
        }

        const barWeightInLbs = bar.weight;
        const displayBarWeight = convertWeight(barWeightInLbs, unit);

        if (targetInLbs < barWeightInLbs) {
            setResult({ plates: [], message: `Weight must be at least the bar weight (${displayBarWeight} ${unit}).` }); return;
        }

        let weightToLoadInLbs = targetInLbs - barWeightInLbs;
        const numSides = calculationType === 'two-sided' ? 2 : 1;
        let weightPerSideInLbs = weightToLoadInLbs / numSides;

        // Use a small tolerance for floating point issues when checking if just the bar is needed
        if (Math.abs(weightToLoadInLbs) < 0.01) {
           setResult({ plates: [], message: `Just the bar (${displayBarWeight} ${unit}).` }); return;
        }

        let platesForSide = [];
        let availablePlates = JSON.parse(JSON.stringify(plates.sort((a,b) => b.weight - a.weight)));

        for (const plate of availablePlates) {
            if (plate.weight <= 0) continue;
            // Use a small tolerance for floating point issues
            const platesNeeded = Math.floor(roundToDecimal(weightPerSideInLbs / plate.weight, 3) + 1e-9);
            const platesToUse = Math.min(platesNeeded, Math.floor(plate.quantity / numSides));
            for (let i = 0; i < platesToUse; i++) platesForSide.push(plate);
            weightPerSideInLbs = roundToDecimal(weightPerSideInLbs - (platesToUse * plate.weight), 3);
        }

        const loadedWeightInLbs = platesForSide.reduce((sum, p) => sum + p.weight, 0) * numSides + barWeightInLbs;
        const loadedWeight = convertWeight(loadedWeightInLbs, unit);
        const displayLoadedWeight = loadedWeight % 1 === 0 ? loadedWeight : loadedWeight.toFixed(2);

        // Use a small tolerance for floating point issues when comparing loaded weight to target weight
        if (Math.abs(roundToDecimal(loadedWeightInLbs, 3) - roundToDecimal(targetInLbs, 3)) > 0.01) {
             setResult({ plates: platesForSide, message: `Closest is ${displayLoadedWeight} ${unit}.` });
        } else {
             setResult({ plates: platesForSide, message: `Total: ${displayLoadedWeight} ${unit}` });
        }
    }, [targetWeight, selectedBarId, calculationType, plates, bars, isLoading, unit]);

    const selectedBar = bars.find(b => b.id === selectedBarId) || {};

    const getStep = () => {
        if (unit === 'lbs') {
            return calculationType === 'two-sided' ? 5 : 2.5;
        } else {
            return calculationType === 'two-sided' ? 1 : 0.5;
        }
    }

    if (isLoading) return <Spinner />;

            return (
        <div className="px-4 md:px-6 pb-4 text-white mt-4">
            <div className="bg-gray-800 p-6 rounded-2xl shadow-lg mb-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label htmlFor="target-weight" className="block text-sm font-medium text-gray-400 mb-2">Target Weight ({unit})</label>
                        <div className="flex items-center">
                            <button onClick={() => setTargetWeight(prev => Math.max(0, parseFloat(prev) - getStep()))}
                                    className="bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 px-4 rounded-l-lg text-2xl transition-colors duration-200 border-y-2 border-gray-600">
                                -
                            </button>
                            <input id="target-weight" type="number" value={targetWeight}
                                   inputmode="numeric"
                                   step={getStep()}
                                   onChange={(e) => setTargetWeight(e.target.value)}
                                   className="w-full bg-gray-700 border-y-2 border-gray-600 text-white rounded-none py-3 px-3 text-2xl font-bold text-center focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition" />
                            <button onClick={() => setTargetWeight(prev => parseFloat(prev) + getStep())}
                                    className="bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 px-4 rounded-r-lg text-2xl transition-colors duration-200 border-y-2 border-gray-600">
                                +
                            </button>
                        </div>
                    </div>
                    <div>
                        <label htmlFor="bar-select" className="block text-sm font-medium text-gray-400 mb-2">Select Bar</label>
                        <select id="bar-select" value={selectedBarId} onChange={(e) => setSelectedBarId(e.target.value)}
                            className="w-full bg-gray-700 border-2 border-gray-600 text-white rounded-lg p-3 text-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition appearance-none"
                            style={{ background: 'url(\'data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23CBD5E1%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.4-5.4-12.8z%22%2F%3E%3C%2Fsvg%3E\') no-repeat right 1rem center / 1em' }}>
                            {bars.map(bar => <option className="bg-gray-800" key={bar.id} value={bar.id}>{bar.name} ({convertWeight(bar.weight, unit)} {unit})</option>)}
                        </select>
                    </div>
                </div>
                <div className="mt-6">
                    <label className="block text-sm font-medium text-gray-400 mb-2">Load Type</label>
                    <div className="grid grid-cols-2 gap-2 bg-gray-900 p-1 rounded-lg">
                        {['two-sided', 'one-sided'].map(type => (
                            <button key={type} onClick={() => setCalculationType(type)} className={`px-4 py-2 text-sm font-bold rounded-md transition-all duration-200 ${calculationType === type ? 'bg-blue-600 text-white shadow' : 'bg-transparent text-gray-300 hover:bg-gray-700'}`}>
                                {type.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
            <div className="bg-gray-800 p-6 rounded-2xl shadow-lg">
                 <h3 className="text-lg font-bold text-white mb-4">Plates Per Side:</h3>
                 {result.plates.length > 0 ? (
                    <div className="flex flex-wrap gap-3">
                        {result.plates.map((plate, index) => (
                             <div key={index} style={{backgroundColor: plate.color}} className="text-white rounded-full px-4 py-2 text-sm font-bold shadow-md flex items-center">{convertWeight(plate.weight, unit)} {unit}</div>
                        ))}
                    </div>
                 ) : <p className="text-gray-400">No plates needed for this weight.</p>}
                 <p className="text-center font-semibold text-blue-400 mt-4 text-lg">{result.message}</p>
            </div>
            <BarbellVisualizer bar={selectedBar} platesOnBar={result.plates} calculationType={calculationType} unit={unit} />
        </div>
    );
};

const ReverseCalculatorPage = ({ unit }) => {
    const { plates, bars, isLoading } = useContext(InventoryContext);
    const [selectedPlates, setSelectedPlates] = useState([]); // Plates on ONE side
    const [selectedBarId, setSelectedBarId] = useState('');
    const [totalWeight, setTotalWeight] = useState(0);
    const [sidedness, setSidedness] = useState('both-sides'); // 'both-sides' or 'one-side'

    useEffect(() => {
        if (bars.length > 0 && !selectedBarId) {
             const defaultBar = bars.find(b => b.weight === 45) || bars[0];
            setSelectedBarId(defaultBar.id);
        }
    }, [bars, selectedBarId]);

    useEffect(() => {
        const barWeightInLbs = bars.find(b => b.id === selectedBarId)?.weight || 0;
        const platesWeightPerSideInLbs = selectedPlates.reduce((sum, p) => sum + p.weight, 0);
        const numSides = sidedness === 'both-sides' ? 2 : 1;
        const totalWeightInLbs = barWeightInLbs + (platesWeightPerSideInLbs * numSides);
        setTotalWeight(convertWeight(totalWeightInLbs, unit));
    }, [selectedPlates, selectedBarId, bars, unit, sidedness]);

    const addPlate = (plate) => setSelectedPlates(prev => [...prev, plate].sort((a,b) => b.weight - a.weight));
    const removePlate = (index) => setSelectedPlates(prev => prev.filter((_, i) => i !== index));

    const formatWeight = (weight) => {
        return weight % 1 === 0 ? weight : weight.toFixed(2);
    }

    if (isLoading) return <Spinner />;

    return (
        <div className="p-4 md:p-6 text-white space-y-6">
            <div className="bg-gray-800 p-6 rounded-2xl shadow-lg text-center">
                <h2 className="text-lg font-medium text-gray-400">Total Weight</h2>
                <p className="text-5xl font-bold text-blue-400 my-2">{formatWeight(totalWeight)} <span className="text-3xl">{unit}</span></p>
                <select value={selectedBarId} onChange={(e) => setSelectedBarId(e.target.value)}
                    className="w-full max-w-xs mx-auto bg-gray-700 border-2 border-gray-600 text-white rounded-lg p-2 mt-4 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition appearance-none"
                    style={{ background: 'url(\'data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23CBD5E1%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.4-5.4-12.8z%22%2F%3E%3C%2Fsvg%3E\') no-repeat right 1rem center / 1em' }}>
                    {bars.map(bar => <option className="bg-gray-800" key={bar.id} value={bar.id}>{bar.name} ({convertWeight(bar.weight, unit)} {unit})</option>)}
                </select>
                <div className="mt-4 grid grid-cols-2 gap-2 bg-gray-900 p-1 rounded-lg max-w-xs mx-auto">
                    {['both-sides', 'one-side'].map(type => (
                        <button key={type} onClick={() => setSidedness(type)} className={`px-4 py-2 text-sm font-bold rounded-md transition-all duration-200 ${sidedness === type ? 'bg-blue-600 text-white shadow' : 'bg-transparent text-gray-300 hover:bg-gray-700'}`}>
                            {type.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </button>
                    ))}
                </div>
            </div>
            <div className="bg-gray-800 p-4 rounded-2xl shadow-lg min-h-[120px]">
                <h3 className="font-bold text-white mb-3">Plates on one side</h3>
                <div className="flex flex-wrap gap-2">
                    {selectedPlates.length > 0 ? selectedPlates.map((plate, index) => (
                        <button key={index} onClick={() => removePlate(index)} style={{backgroundColor: plate.color}} className="text-white rounded-full px-3 py-1.5 text-sm font-bold shadow-md flex items-center transition-transform hover:scale-105">
                           {convertWeight(plate.weight, unit)} <span className="ml-2 text-red-200 text-xs">X</span>
                       </button>
                    )) : <p className="text-gray-400 text-sm w-full text-center">Click a plate below to add it to one side.</p>}
                </div>
            </div>
            <div className="bg-gray-800 p-4 rounded-2xl shadow-lg">
                <h3 className="font-bold text-white mb-3">Add Plates from Inventory</h3>
                 <div className="flex flex-wrap gap-3">
                    {plates.map(plate => (
                        <button key={plate.id} onClick={() => addPlate(plate)} style={{backgroundColor: plate.color}} className="text-white rounded-lg px-4 py-2 text-md font-bold shadow-md transition-transform hover:scale-105 active:scale-95">
                           + {convertWeight(plate.weight, unit)} {unit}
                       </button>
                    ))}
                </div>
            </div>
        </div>
    );
};

const InventoryPage = ({ unit }) => {
    const { plates, bars, addItem, updateItem, deleteItem, isLoading } = useContext(InventoryContext);
    const [modalOpen, setModalOpen] = useState(false);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [modalContent, setModalContent] = useState({ type: null, data: null });
    const [itemToDelete, setItemToDelete] = useState(null);

    const openModal = (type, data = null) => { setModalContent({ type, data }); setModalOpen(true); };
    const closeModal = () => { setModalOpen(false); setModalContent({ type: null, data: null }); };

    const handleSave = (formData) => {
        const type = modalContent.type.includes('plate') ? 'plates' : 'bars';
        let weightInLbs = parseFloat(formData.weight);
        if(unit === 'kg') weightInLbs = convertWeight(weightInLbs, 'lbs', 'kg');

        const dataToSave = { ...formData, weight: weightInLbs, unit: 'lbs' };
        if(formData.quantity) dataToSave.quantity = parseInt(formData.quantity, 10);

        if (modalContent.data) updateItem(type, modalContent.data.id, dataToSave);
        else addItem(type, dataToSave);
        closeModal();
    };

    const confirmDelete = (type, id) => { setItemToDelete({ type, id }); setConfirmOpen(true); };
    const executeDelete = () => { if(itemToDelete) deleteItem(itemToDelete.type, itemToDelete.id); setConfirmOpen(false); setItemToDelete(null); };

    return (
        <div className="p-4 md:p-6 text-white space-y-6">
            <h1 className="text-3xl font-bold text-center">Manage Inventory</h1>
            {isLoading ? <Spinner /> : (
                <>
                    <div className="bg-gray-800 p-5 rounded-2xl shadow-lg">
                        <div className="flex justify-between items-center mb-4"><h2 className="text-xl font-bold">Plates</h2><button onClick={() => openModal('plate-form')} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition">Add Plate</button></div>
                        <ul className="space-y-3">
                            {plates.map(plate => (
                                <li key={plate.id} className="bg-gray-900 p-3 rounded-lg flex items-center justify-between">
                                    <div className="flex items-center"><div style={{ backgroundColor: plate.color }} className="w-8 h-8 rounded-full mr-4 border-2 border-gray-700"></div><div><p className="font-bold text-lg">{convertWeight(plate.weight, unit)} {unit}</p><p className="text-sm text-gray-400">Quantity: {plate.quantity}</p></div></div>
                                    <div className="flex gap-2"><button onClick={() => openModal('plate-form', plate)} className="bg-gray-700 hover:bg-gray-600 p-2 rounded-md"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" /><path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd" /></svg></button><button onClick={() => confirmDelete('plates', plate.id)} className="bg-red-800 hover:bg-red-700 p-2 rounded-md"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" /></svg></button></div>
                                </li>
                            ))}
                        </ul>
                    </div>
                    <div className="bg-gray-800 p-5 rounded-2xl shadow-lg">
                        <div className="flex justify-between items-center mb-4"><h2 className="text-xl font-bold">Bars</h2><button onClick={() => openModal('bar-form')} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition">Add Bar</button></div>
                        <ul className="space-y-3">
                           {bars.map(bar => (
                                <li key={bar.id} className="bg-gray-900 p-3 rounded-lg flex items-center justify-between">
                                    <div><p className="font-bold text-lg">{bar.name}</p><p className="text-sm text-gray-400">{convertWeight(bar.weight, unit)} {unit}</p></div>
                                    <div className="flex gap-2"><button onClick={() => openModal('bar-form', bar)} className="bg-gray-700 hover:bg-gray-600 p-2 rounded-md"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" /><path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd" /></svg></button><button onClick={() => confirmDelete('bars', bar.id)} className="bg-red-800 hover:bg-red-700 p-2 rounded-md"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" /></svg></button></div>
                                </li>
                            ))}
                        </ul>
                    </div>
                </>
            )}
            <Modal isOpen={modalOpen} onClose={closeModal} title={modalContent.data ? 'Edit Item' : 'Add Item'}>
                {modalContent.type === 'plate-form' && <PlateForm data={modalContent.data} onSave={handleSave} onCancel={closeModal} unit={unit} />}
                {modalContent.type === 'bar-form' && <BarForm data={modalContent.data} onSave={handleSave} onCancel={closeModal} unit={unit} />}
            </Modal>
            <ConfirmationModal isOpen={confirmOpen} onClose={() => setConfirmOpen(false)} onConfirm={executeDelete} title="Confirm Deletion" message="Are you sure you want to delete this item? This action cannot be undone." />
        </div>
    );
};

const PlateForm = ({ data, onSave, onCancel, unit }) => {
    const [formData, setFormData] = useState({
        weight: data ? convertWeight(data.weight, unit) : '',
        quantity: data?.quantity || '',
        color: data?.color || '#3B82F6',
    });
    const handleChange = (e) => setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    const handleSubmit = (e) => { e.preventDefault(); onSave(formData); };
    return (
        <form onSubmit={handleSubmit} className="space-y-4 text-white">
            <div><label className="block text-sm font-medium text-gray-300">Weight ({unit})</label><input type="number" step="any" name="weight" value={formData.weight} onChange={handleChange} className="w-full bg-gray-700 border border-gray-600 rounded-lg p-2 mt-1" required inputmode="numeric" /></div>
            <div><label className="block text-sm font-medium text-gray-300">Quantity</label><input type="number" name="quantity" value={formData.quantity} onChange={handleChange} className="w-full bg-gray-700 border border-gray-600 rounded-lg p-2 mt-1" required inputmode="numeric" /></div>
            <div><label className="block text-sm font-medium text-gray-300">Color</label><input type="color" name="color" value={formData.color} onChange={handleChange} className="w-full h-10 bg-gray-700 border border-gray-600 rounded-lg p-1 mt-1" /></div>
            <div className="flex justify-end gap-3 pt-4"><button type="button" onClick={onCancel} className="bg-gray-600 hover:bg-gray-500 font-bold py-2 px-4 rounded-lg">Cancel</button><button type="submit" className="bg-blue-600 hover:bg-blue-700 font-bold py-2 px-4 rounded-lg">Save</button></div>
        </form>
    );
};

const BarForm = ({ data, onSave, onCancel, unit }) => {
    const [formData, setFormData] = useState({ name: data?.name || '', weight: data ? convertWeight(data.weight, unit) : '' });
    const handleChange = (e) => setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    const handleSubmit = (e) => { e.preventDefault(); onSave(formData); };
    return (
        <form onSubmit={handleSubmit} className="space-y-4 text-white">
            <div><label className="block text-sm font-medium text-gray-300">Bar Name</label><input type="text" name="name" value={formData.name} onChange={handleChange} className="w-full bg-gray-700 border border-gray-600 rounded-lg p-2 mt-1" required /></div>
            <div><label className="block text-sm font-medium text-gray-300">Weight ({unit})</label><input type="number" step="any" name="weight" value={formData.weight} onChange={handleChange} className="w-full bg-gray-700 border border-gray-600 rounded-lg p-2 mt-1" required inputmode="numeric" /></div>
            <div className="flex justify-end gap-3 pt-4"><button type="button" onClick={onCancel} className="bg-gray-600 hover:bg-gray-500 font-bold py-2 px-4 rounded-lg">Cancel</button><button type="submit" className="bg-blue-600 hover:bg-blue-700 font-bold py-2 px-4 rounded-lg">Save</button></div>
        </form>
    );
};


// --- [4] MAIN APP COMPONENT ---

export default function App() {
    const [page, setPage] = useState('calculator'); // calculator, reverse, inventory
    const [unit, setUnit] = useState('lbs'); // lbs, kg
    const [targetWeight, setTargetWeight] = useState(135); // Lifted state for target weight

    const NavButton = ({ target, label, icon }) => (
        <button onClick={() => setPage(target)} className={`flex-1 flex flex-col items-center justify-center p-2 rounded-lg transition-colors ${page === target ? 'bg-blue-600 text-white' : 'text-gray-400 hover:bg-gray-700'}`}>
            {icon}<span className="text-xs font-medium mt-1">{label}</span>
        </button>
    );

        const AppIcon = () => <img src={barbellOutlineSvg} alt="Barbell Icon" className="w-10 h-10 text-blue-500" />
    const CalculatorIcon = () => <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="3" /></svg>


    return (
        <InventoryProvider>
          <div className="bg-gray-900 min-h-screen font-sans">
              <div className="max-w-2xl mx-auto pb-4">
                  <header className="flex justify-between items-center px-4 pt-12 text-white">
                        <div className="flex items-center gap-4">
                            <AppIcon />
                            <h1 className="text-2xl font-bold">Barbell Calculator</h1>
                        </div>
                        <div className="flex items-center space-x-2">
                             <span className={`font-bold text-sm ${unit === 'lbs' ? 'text-white' : 'text-gray-500'}`}>lbs</span>
                             <button onClick={() => setUnit(u => u === 'lbs' ? 'kg' : 'lbs')} className="bg-gray-700 rounded-full w-12 h-6 flex items-center p-1 transition-all duration-300"><div className={`w-5 h-5 bg-white rounded-full shadow-md transform transition-transform ${unit === 'kg' ? 'translate-x-5' : ''}`}></div></button>
                             <span className={`font-bold text-sm ${unit === 'kg' ? 'text-white' : 'text-gray-500'}`}>kg</span>
                        </div>
                   </header>
                  <main className="pb-20">
                    {page === 'calculator' && <CalculatorPage unit={unit} targetWeight={targetWeight} setTargetWeight={setTargetWeight} />}
                    {page === 'reverse' && <ReverseCalculatorPage unit={unit} />}
                    {page === 'inventory' && <InventoryPage unit={unit} />}
                  </main>
              </div>
              <nav className="fixed bottom-0 left-0 right-0 bg-gray-800 border-t border-gray-700 max-w-2xl mx-auto rounded-t-2xl shadow-lg">
                  <div className="flex justify-around p-2">
                      <NavButton target="calculator" label="Calculator" icon={<CalculatorIcon />} />
                      <NavButton target="reverse" label="Reverse" icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12.5 8H10V3L5 8l5 5V9.5h2.5c2.35 0 4.25 1.9 4.25 4.25S14.85 18 12.5 18H10v2h2.5c3.45 0 6.25-2.8 6.25-6.25S15.95 8 12.5 8z"></path></svg>} />
                      <NavButton target="inventory" label="Inventory" icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg>} />
                  </div>
              </nav>
          </div>
        </InventoryProvider>
    );
}
