import { Modal, Box, Button } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';

import './ErrorModal.css';

const ErrorModal = ({ open, onCloseModal, errorText }) => {
    const style = {
        margin: '70px auto',
        width: '50%',
        bgcolor: 'background.paper',
        border: '1px solid grey',
        borderRadius: '3px',
        boxShadow: 24,
        padding: '10px'
    };

    return (
        <Modal
            open={open}
            onClose={onCloseModal}
            aria-labelledby='modal-modal-title'
            aria-describedby='modal-modal-description'
        >
            <Box sx={style}>
                <div className='error-modal-header'>
                    <h2>Error</h2>
                    <div className='close-modal-btn'>
                        <CloseIcon />
                    </div>
                </div>
                <hr />
                <div className='error-text-container'>
                    <p>{errorText}</p>
                </div>
            </Box>
        </Modal>
    );
}

export default ErrorModal;