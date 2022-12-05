import React, { useState, useEffect } from 'react';

import { CircularProgress } from '@mui/material';

import './Form.css';

import { format } from 'date-fns';
import AOS from 'aos';
import 'aos/dist/aos.css';

const Form = ({ onAddItem }) => {
    const [branchData, setBranchData] = useState([]);
    const [buildData, setBuildData] = useState([]);
    const [qtx64Version, setQtx64Version] = useState([]);
    const [qtx86Version, setQtx86Version] = useState([]);
    const [loadingVersions, setLoadingVersions] = useState(false);

    useEffect(() => {
        setLoadingVersions(true);
        fetch('/data')
          .then(response => response.json())
          .then(response => {
            setBranchData(response.branchData);
            setBuildData(response.buildData.builds.filter(item => item.x64 === true));
            setQtx64Version(response.buildData.Qt_versions.x64.filter(item => item.show === true));
            setQtx86Version(response.buildData.Qt_versions.x86.filter(item => item.show === true));
            document.getElementById('x64-checkbox').checked = true;
            setLoadingVersions(false);
          })
          .catch(error => {
            console.log(error);
            setLoadingVersions(false);
          })
    }, [])

    useEffect(() => {
        if (qtx64Version.length !== 0) {
            document.getElementById(qtx64Version[qtx64Version.length - 1].version + '-x64').checked = true;
        }
    }, [qtx64Version])

    const [buildItems, setBuildItems] = useState([]);
    const [branchItem, setBranchItem] = useState('master');
    const [formIsValid, setFormIsValid] = useState(false);

    function updateBuildItems() {
        var arr = [];
        for (let i = 0; i < buildData.length; i++) {
            if (document.getElementById(buildData[i].name).checked) {
                arr.push(buildData[i]);
            }
        }

        setBuildItems(arr);

        if ((document.getElementById('x64-checkbox').checked || document.getElementById('x86-checkbox').checked) && arr.length > 0) {
            setFormIsValid(true)
        } else {
            setFormIsValid(false)
        }
    }

    const updateVersionsHandler = () => {
        if (document.getElementById('x64-checkbox').checked && document.getElementById('x86-checkbox').checked) {
            fetch('/data')
              .then(response => response.json())
              .then(response => {
                setBuildData(response.buildData.builds)
            })
        } else if (document.getElementById('x86-checkbox').checked) {
            fetch('/data')
              .then(response => response.json())
              .then(response => {
                setBuildData(response.buildData.builds.filter(item => item.x86 === true))
            })
        } else if (document.getElementById('x64-checkbox').checked) {
            fetch('/data')
              .then(response => response.json())
              .then(response => {
                setBuildData(response.buildData.builds.filter(item => item.x64 === true));
            })
        } else {
            fetch('/data')
              .then(response => response.json())
              .then(response => {
                setBuildData([])
            })
        }
    }

    const [activeQtVersionx64, setActiveQtVersionx64] = useState(true);
    const [activeQtVersionx86, setActiveQtVersionx86] = useState(false);

    const visiblex64Handler = () => {
        if ((document.getElementById('x64-checkbox').checked || document.getElementById('x86-checkbox').checked) && buildItems.length > 0) {
            setFormIsValid(true)
        }

        if (!document.getElementById('x64-checkbox').checked) {
            setActiveQtVersionx64(active => !active);
            for (let i = 0; i < qtx64Version.length; i++) {
                document.getElementById(qtx64Version[i].version + '-x64').checked = false;
            }
        } else {
            for (let i = 0; i < qtx64Version.length; i++) {
                document.getElementById(qtx64Version[qtx64Version.length - 1].version + '-x64').checked = true;
            }
        }

        updateVersionsHandler();
    }

    const visiblex86Handler = () => {
        if ((document.getElementById('x64-checkbox').checked || document.getElementById('x86-checkbox').checked) && buildItems.length > 0) {
            setFormIsValid(true)
        }

        if (!document.getElementById('x86-checkbox').checked) {
            setActiveQtVersionx86(active => !active);
            for (let i = 0; i < qtx86Version.length; i++) {
                document.getElementById(qtx86Version[i].version + '-x86').checked = false;
            }
        } else {
            for (let i = 0; i < qtx64Version.length; i++) {
                document.getElementById(qtx86Version[qtx86Version.length - 1].version + '-x86').checked = true;
            }
        }

        updateVersionsHandler();
    }

    // For default button
    // let defaultBuilds = [];
    // for (let i = 0; i < buildData.length; i++) {
    //     if (buildData[i].isDefault === true) {
    //         defaultBuilds.push(buildData[i]);
    //     };
    // };

    // const checkDefHandler = () => {
    //     for (let i = 0; i < buildData.length; i++) {
    //         let check = defaultBuilds.includes(buildData[i]);
    //         document.getElementById(buildData[i].name).checked = check;
    //     };

    //     updateBuildItems();
    //     if (document.getElementById('x64-checkbox').checked  || document.getElementById('x86-checkbox').checked) {
    //         setFormIsValid(true);
    //     }
    // }

    const submitHandler = (event) => {
        event.preventDefault();

        let systemNamex64 = false;
        if (document.getElementById('x64-checkbox').checked) {
            systemNamex64 = true
        }

        let systemNamex86 = false;
        if (document.getElementById('x86-checkbox').checked) {
            systemNamex86 = true
        }

        let qtVersionx64 = {version: 'not determined', full:'not determined'};
        let qtVersionx86 = 'not determined';

        for (let i = 0; i < qtx64Version.length; i++) { 
            if (document.getElementById(qtx64Version[i].version + '-x64').checked === true) {
                qtVersionx64 = qtx64Version[i];
            }
        }

        for (let i = 0; i < qtx86Version.length; i++) { 
            if (document.getElementById(qtx86Version[i].version + '-x86').checked === true) {
                qtVersionx86 = qtx86Version[i];
            }
        };

        let skipFailed = false;
        if (document.getElementById('skip-checkbox').checked === true) {
            skipFailed = true;
        };

        let highPriority = false;
        if (document.getElementById('high-priority-checkbox').checked === true) {
            highPriority = true;
        };

        for (let i = 0; i < buildItems.length; i++) {
            buildItems[i] = {
                ...buildItems[i],
                buildStatus: 0,
            };
        };

        const itemsDataObject = {   
            branch: branchItem,
            builds: buildItems,
            systemx64: systemNamex64,
            systemx86: systemNamex86,
            qtVersionx64: qtVersionx64,
            qtVersionx86: qtVersionx86,
            skipFailed: skipFailed,
            highPriority: highPriority,
            status: 0xE0,
            error: "empty",
            logFilePath: "none",
            date: format(new Date(), "d/MMM/yy HH:mm:ss"),
        };

        for (let i = 0; i < buildData.length; i++) {
            document.getElementById(buildData[i].name).checked = false;
        }

        document.getElementById('skip-checkbox').checked = false;
        document.getElementById('high-priority-checkbox').checked = false;
        updateBuildItems();
        onAddItem(itemsDataObject);
        setBranchItem('master');
        setFormIsValid(false);
    };

    return (
        <React.Fragment>
            <form onSubmit={submitHandler}>
                <div className='form-items-container'>
                    <div className='branches-container'>
                        <h2>Select Branch:</h2>
                        <ul>
                            {!loadingVersions && branchData.map(branch => (
                                    <li data-aos='flip-up' data-aos-delay='100' key={branch}>
                                        <input 
                                            type='radio' 
                                            id={branch + 'branch'} 
                                            name='branch-radio'
                                            checked={branch === branchItem}
                                            onChange={() => setBranchItem(branch)}
                                        />
                                        <label htmlFor={branch + 'branch'}>{branch}</label>
                                    </li>
                                ))
                            }
                            {loadingVersions && <div style={{ margin: "10px auto" }}><CircularProgress style={{ color: "#5e6072" }} /></div>}
                        </ul>
                    </div>
                    <div className='builds-container'>
                        <div className='builds-title-container'>
                            <div className='builds-title__head'>
                                <h2>Select Build:</h2>  
                                <div className='def__skip-btns'>
                                    <div className='skip__heigh-btns'>
                                        {/* Default button  <div onClick={checkDefHandler} className='default-btn'>Select default</div> */}
                                        <div className='skip-btn'>
                                            <input type='checkbox' id='skip-checkbox' name='skip-checkbox' />
                                            <label htmlFor='skip-checkbox'>Skip failed</label>
                                        </div>
                                        <div className='high-btn'>
                                            <input type='checkbox' id='high-priority-checkbox' name='high-priority-checkbox' />
                                            <label htmlFor='high-priority-checkbox'>High-priority</label>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className='qt-versions-container'>
                            <div className='qt-versions__x64-box'>
                                <div className='x64-btn'>
                                    <input type='checkbox' onChange={visiblex64Handler} name='x64-checkbox' id='x64-checkbox' />
                                    <label htmlFor='x64-checkbox' onClick={visiblex64Handler}>x64</label>
                                </div>
                                {<div className={activeQtVersionx64 ? 'qt-version-btns' : 'not-active-qt-version-btnsx64'}>
                                    {qtx64Version.map(item => (
                                        <div className='qt-version' key={item.version}>
                                            <input 
                                                type='radio' 
                                                name='x64-version'
                                                id={`${item.version}-x64`}
                                            />
                                            <label htmlFor={`${item.version}-x64`}>{item.version.split('.')[0]}.{item.version.split('.')[1]}</label>
                                        </div>
                                    ))}
                                </div>}
                            </div>
                            <div className='qt-versions__x86-box'>
                                <div className='x86-btn'>
                                    <input type='checkbox' onChange={visiblex86Handler} name='x86-checkbox' id='x86-checkbox'/>
                                    <label htmlFor='x86-checkbox' onClick={visiblex86Handler}>x86</label>
                                </div>
                                {<div className={activeQtVersionx86 ? 'qt-version-btns' : 'not-active-qt-version-btnsx86'}>
                                    {qtx86Version.map(item => (
                                        <div className='qt-version' key={item.version}>
                                            <input 
                                                type='radio'
                                                name='x86-version'
                                                id={`${item.version}-x86`}
                                            />
                                            <label htmlFor={`${item.version}-x86`}>{item.version.split('.')[0]}.{item.version.split('.')[1]}</label>
                                        </div>
                                    ))}
                                </div>}
                            </div>
                        </div>
                        <ul>
                            {!loadingVersions && buildData.map((build) => (
                                <li data-aos='flip-up' data-aos-delay='300' key={build.name}>
                                    <input
                                        type='checkbox'
                                        name={build.name}
                                        id={build.name}
                                        onChange={updateBuildItems}
                                    />
                                    <label htmlFor={build.name}>{build.name}</label> 
                                </li>
                            ))}
                            {loadingVersions && <div style={{ margin: "10px auto" }}><CircularProgress style={{ color: "#5e6072" }} /></div>}
                        </ul>
                    </div>
                </div>
                <div className='add-btn__box'>
                    <button className='add-btn' disabled={!formIsValid}>Add</button>
                </div>
            </form>
        </React.Fragment>
    );
};

export default Form;

AOS.init({
    // Global settings:
    disable: false,
    startEvent: 'DOMContentLoaded', 
    initClassName: 'aos-init', 
    animatedClassName: 'aos-animate', 
    useClassNames: false,
    disableMutationObserver: false, 
    debounceDelay: 50, 
    throttleDelay: 99,

    // Settings that can be overridden on per-element basis, by `data-aos-*` attributes:
    offset: 50,
    delay: 0, 
    duration: 600, 
    easing: 'ease',
    once: true,
    mirror: false,
    anchorPlacement: 'top-bottom', 
});