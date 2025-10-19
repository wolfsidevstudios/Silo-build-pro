import React, { useState } from 'react';

export interface SpreadsheetData {
    id: string;
    name: string;
    columns: string[];
    rows: string[][];
}

interface SpreadsheetEditorProps {
    spreadsheet: SpreadsheetData;
    onUpdate: (updatedSpreadsheet: SpreadsheetData) => void;
    onBack: () => void;
}

export const SpreadsheetEditor: React.FC<SpreadsheetEditorProps> = ({ spreadsheet, onUpdate, onBack }) => {
    const handleCellChange = (rowIndex: number, colIndex: number, value: string) => {
        const newRows = [...spreadsheet.rows];
        newRows[rowIndex][colIndex] = value;
        onUpdate({ ...spreadsheet, rows: newRows });
    };
    
    const handleHeaderChange = (colIndex: number, value: string) => {
        const newColumns = [...spreadsheet.columns];
        newColumns[colIndex] = value;
        onUpdate({ ...spreadsheet, columns: newColumns });
    };

    const handleNameChange = (name: string) => {
        onUpdate({ ...spreadsheet, name });
    };

    const addRow = () => {
        const newRow = Array(spreadsheet.columns.length).fill('');
        onUpdate({ ...spreadsheet, rows: [...spreadsheet.rows, newRow] });
    };
    
    const addColumn = () => {
        const newColumnName = `Column ${spreadsheet.columns.length + 1}`;
        const newColumns = [...spreadsheet.columns, newColumnName];
        const newRows = spreadsheet.rows.map(row => [...row, '']);
        onUpdate({ ...spreadsheet, columns: newColumns, rows: newRows });
    };
    
    const deleteRow = (rowIndex: number) => {
        const newRows = spreadsheet.rows.filter((_, index) => index !== rowIndex);
        onUpdate({ ...spreadsheet, rows: newRows });
    };
    
    const deleteColumn = (colIndex: number) => {
        const newColumns = spreadsheet.columns.filter((_, index) => index !== colIndex);
        const newRows = spreadsheet.rows.map(row => row.filter((_, index) => index !== colIndex));
        onUpdate({ ...spreadsheet, columns: newColumns, rows: newRows });
    };

    return (
        <div className="p-4 bg-white rounded-lg border border-gray-200 h-full flex flex-col">
            <div className="flex justify-between items-center mb-4">
                 <button onClick={onBack} className="flex items-center text-sm font-semibold text-gray-600 hover:text-black">
                    <span className="material-symbols-outlined text-base mr-1">arrow_back</span>
                    Back to Data Sources
                </button>
                <input 
                    type="text"
                    value={spreadsheet.name}
                    onChange={(e) => handleNameChange(e.target.value)}
                    className="text-xl font-bold text-gray-800 text-center bg-transparent outline-none focus:ring-1 focus:ring-blue-500 rounded-md px-2"
                />
                <div className="w-36"></div>
            </div>
            <div className="flex-1 overflow-auto">
                <table className="w-full border-collapse">
                    <thead>
                        <tr className="bg-gray-50 sticky top-0 z-10">
                            <th className="p-2 border border-gray-300 w-12"></th>
                            {spreadsheet.columns.map((col, colIndex) => (
                                <th key={colIndex} className="p-2 border border-gray-300 font-semibold text-sm group relative">
                                    <input 
                                        type="text" 
                                        value={col} 
                                        onChange={(e) => handleHeaderChange(colIndex, e.target.value)} 
                                        className="w-full bg-transparent outline-none text-center font-semibold"
                                    />
                                    <button onClick={() => deleteColumn(colIndex)} className="absolute top-1/2 -translate-y-1/2 right-1 p-0.5 rounded-full bg-red-100 text-red-600 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>close</span>
                                    </button>
                                </th>
                            ))}
                            <th className="p-2 border border-gray-300 w-12">
                                <button onClick={addColumn} title="Add Column" className="w-full h-full flex items-center justify-center text-gray-500 hover:text-black">+</button>
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {spreadsheet.rows.map((row, rowIndex) => (
                            <tr key={rowIndex} className="group hover:bg-gray-50">
                                <td className="p-2 border border-gray-300 text-center text-xs text-gray-500 relative">
                                    {rowIndex + 1}
                                    <button onClick={() => deleteRow(rowIndex)} className="absolute top-1/2 -translate-y-1/2 right-1 p-0.5 rounded-full bg-red-100 text-red-600 opacity-0 group-hover:opacity-100 transition-opacity">
                                         <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>close</span>
                                    </button>
                                </td>
                                {row.map((cell, colIndex) => (
                                    <td key={colIndex} className="p-0 border border-gray-300">
                                        <input 
                                            type="text" 
                                            value={cell} 
                                            onChange={(e) => handleCellChange(rowIndex, colIndex, e.target.value)} 
                                            className="w-full h-full p-2 bg-transparent outline-none focus:bg-blue-50"
                                        />
                                    </td>
                                ))}
                                <td className="p-2 border border-gray-300"></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <button onClick={addRow} className="mt-4 px-4 py-2 bg-gray-200 text-sm font-semibold rounded-lg self-start hover:bg-gray-300">
                + Add Row
            </button>
        </div>
    );
};
