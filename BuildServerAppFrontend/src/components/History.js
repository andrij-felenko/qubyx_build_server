import React from 'react';
import { format } from 'date-fns';

import './History.css';

import Accordion from '@mui/material/Accordion';
import CircularProgress from '@mui/material/CircularProgress';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';
import Button from '@mui/material/Button';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import DeleteIcon from '@mui/icons-material/Delete';
import { useLocalHistory } from '../context/historyContext';

const History = ({ onRemoveHistoryItem, historyItems, showLoading }) => {
    const { expandedHandler, isExpandedHandler } = useLocalHistory();

    let visiblePriority = true;
    let finishingDate = '';

    const historyItemStatus = (status) => {
        if (status === 224) {
            return 'In queue';
        } else if (status === 225) {
            return 'Pre build';
        } else if (status === 226) {
            return 'Compile x86...';
        } else if (status === 227) {
            return 'Compile x64...';
        } else if (status === 228) {
            return 'Make installer x86...';
        } else if (status === 229) {
            return 'Make installer x64...';
        } else if (status === 230) {
            return 'Post running...';
        } else if (status === 231) {
            visiblePriority = false;
            finishingDate = 'End: ' + format(new Date(), "d/MMM/yy HH:mm:ss");
            return 'Success!';
        } else if (status === 232) {
            visiblePriority = false;
            finishingDate = 'End: ' + format(new Date(), "d/MMM/yy HH:mm:ss");
            return 'Failed!';
        }; 
    };

    const buildStatus = (status) => {
        if (status === 232) {
            return 'Nothing';
        } else if (status === 233) {
            return 'Waiting...';
        } else if (status === 234) {
            return 'Make installer...';
        } else if (status === 235) {
            return 'Done';
        } else if (status === 236) {
            return 'Failed';
        } else if (status === 237) {
            return 'Skip';
        }; 
    };

    let showMessage = true;
    historyItems.length === 0 ? showMessage = true : showMessage = false;

    if (historyItems.length !== 0 && historyItems.length > 25) {
        onRemoveHistoryItem(historyItems[25]._id);
    };

    return (
        <div className='history-container'>
            <div className='history-title-container'>
                <h2>History</h2>
                <div>{showLoading && <CircularProgress style={{ color: "#5e6072" }} />}</div>
            </div>
            {showMessage && <p className='history-message'>Your history is empty</p>}
            <ul>
                {historyItems.map(historyItem => (
                    <Accordion
                        expanded={isExpandedHandler(historyItem._id)}
                        onChange={expandedHandler(historyItem._id)} 
                        key={historyItem._id + 'key'}
                    >
                        <AccordionSummary
                            expandIcon={<ExpandMoreIcon />}
                        >
                            <div className='accordion-head'>
                                <div className='accordion-head__titles'>
                                    <h3>
                                        {historyItem.branch}  
                                        {historyItem.systemx64 && <span>
                                            (x64,  Qt {historyItem.qtVersionx64.version})
                                        </span>}
                                        {historyItem.systemx86 && <span>
                                            (x86,  Qt {historyItem.qtVersionx86.version})
                                        </span>}
                                    </h3>
                                    <div>
                                        {historyItem.skipFailed && <span className='skip-text'>Skip failed  </span>}
                                        {historyItem.highPriority && visiblePriority && <span className='high-text'>High priority</span>}
                                    </div>
                                    <p className='date-title'>Start: {historyItem.date}</p>
                                    <p className='date-title'>{finishingDate}</p>
                                </div>
                                <p className={
                                        historyItemStatus(historyItem.status) === 'Success!' ? 'success-progress' : 'progress-box' &&
                                        historyItemStatus(historyItem.status) === 'Failed!' ? 'failed-progress' : 'progress-box'
                                    }
                                >
                                    {historyItemStatus(historyItem.status)}
                                </p>
                                {historyItem.error !== 'empty' && <div>{historyItemStatus.error}</div>}
                                <div className='delete-box'>
                                    <Button 
                                        variant='outlined'
                                        startIcon={<DeleteIcon />} 
                                        onClick={onRemoveHistoryItem.bind(this, historyItem._id)}
                                        className='delete-btn'
                                        color='error'
                                    >Delete</Button>
                                </div>  
                            </div>
                        </AccordionSummary>   
                        <AccordionDetails>
                            {historyItem.builds.map(item => (
                                <div 
                                    className={historyItem.builds.length === 1 ? 'build-item' : 'builds-item'} 
                                    key={Math.random().toString()}
                                >
                                    <span>{item.name}</span>
                                    <span className={
                                        buildStatus(item.buildStatus) === 'Failed!' ? 'failed-build' : ''
                                    }>
                                        {/* {historyItemStatus(historyItem.status) !== 'Success!' && historyItemStatus(historyItem.status) !== 'Failed!' && <p>{buildStatus(item.status)}</p>}
                                        {historyItemStatus(historyItem.status) === 'Failed!' && <p style={{color: 'indianred'}}>Failed!</p>}
                                        {historyItemStatus(historyItem.status) === 'Success!' && buildStatus(item.status) === 'Success!' && <p style={{color: 'lightgreen'}}>Success!</p>} */}
                                        {buildStatus(item.buildStatus)}
                                    </span>
                                </div>
                            ))} 
                        </AccordionDetails>
                    </Accordion>
                ))}
            </ul>
        </div>
    );
};

export default History;