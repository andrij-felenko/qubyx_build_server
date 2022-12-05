import BugReportIcon from '@mui/icons-material/BugReport';
import './NotFoundPage.css';

const NotFoundPage = () => {
    return (
        <div className='not-found-container'>
            <div>
                <h1>
                    <BugReportIcon style={{ color: "#5e6072" }} />404
                </h1>
                <p>Page not found!</p>
            </div>
        </div>
    );
};

export default NotFoundPage;