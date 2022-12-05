#include "perfectlum4.h"
#include "SchedulingThread.h"
#include "SingletonPointer.h"
#include "WaitDialog.h"

#include "AppBaseLib/AppInitialization.h"
#include "AppBaseLib/LastLicenses.h"
#include "AppBaseLib/QubyxStyle.h"
#include "AppBaseLib/RegulationList.h"
#include "ApplicationConnecter/PipeAppConnectorClient.h"
#include "CommonLibs/Logging.h"
#include "CommonLibs/QSettingsWithSharing.h"
#include "CommonLibs/QubyxSharedMemory.h"
#include "CommonLibs/UsefulTools.h"
#include "DBLib/DBBacklightRemindTime.h"
#include "DBLib/DBPreferences.h"
#include "DBLib/DBUtils.h"
#include "Displays/DisplayFilter.h"
#include "DisplayComunication/DDCCIDevices/WindowsDDCCIControl.h"
#include "GlobalData/GlobalData.h"
#include "OSUtils/DDCCI.h"
#include "OSUtils/SystemInfo.h"
#include "QDynamicStyle/QDynamicStyle.h"
#include "QubyxNCReport/QubyxNCReport.h"
#include "QubyxProfile/QubyxDisplayProfile.h"
#include "QubyxRegistrationLibrary/CurrentRegistration.h"
#include "QubyxSynchronizeLibrary/RemoteConnecter.h"
#include "QubyxSynchronizeLibrary/Synchronization.h"
#include "StepsRunner/CameraStepsThread.h"
#include "StepsRunner/PrinterStepsThread.h"
#include "StepsRunner/TaskRunner.h"
#include "StepsRunner/StepsThread.h"
#include "WinEventsListener/WindowsEventListener.h"

#include "DisplayInfo/CurrentDisplays.h"
#include "DBLib/DBCalHistory.h"
#include "DBLib/DBSettingsNames.h"
#include "DBLib/DBHistoryQAScheduling.h"
#include "QubyxSynchronizeLibrary/BaseRemoteSettings.h"

Perfectlum4::Perfectlum4(int argc, char *argv[], QString appPath)
    : SingleApplication(argc, argv,
                        QString("P4") + appPath),
      m_splash(nullptr), m_args(arguments())
{
    initLibraryPath();
    initLogs();
    qDebug() << "Start PerfectLum4";
    settings.RenewIfWasError();
    DB::setPath(settings.GetDataBasePath());
    setStyleAndFonts();

    typedef Perfectlum4 PL4;
    connect(this, &PL4::aboutToQuit, this, &PL4::cleanAll, Qt::DirectConnection);

#ifdef Q_OS_WIN
    typedef WindowsEventListener WEL;
    auto winEventListener = std::make_shared <WEL>();
    QObject::connect(winEventListener.get(), &WEL::signalQuit, qApp, &QApplication::quit);
#endif
}

void Perfectlum4::startCalibrationThreads()
{
    SingletonPointer <StepsThread> thread;
//    SingletonPointer <PrinterStepsThread> printerThread;
//    SingletonPointer <CameraStepsThread> cameraThread;
    thread->start();
//    printerThread->start();
//    cameraThread->start();
}

bool Perfectlum4::synchronizeDatabase()
{
    DBPreferences preferences;

    qDebug()<<"Start Sinchronization - "<<preferences.getValue("remoteOn");
    if (preferences.getValue("remoteOn") != "on")
        return false;

    return Synchronization::synchronizeAll(DBUtils::getNetworkSettingsFromDB()) == OK;
}

void Perfectlum4::stopCalibrationThreads()
{
    SingletonPointer <StepsThread> thread;
//    SingletonPointer <PrinterStepsThread> printerThread;
//    SingletonPointer <CameraStepsThread> cameraThread;
    thread->stop();
//    printerThread->stop();
//    cameraThread->stop();
    thread->wait();
//    printerThread->wait();
//    cameraThread->wait();

    SingletonPointer <PipeAppConnectorClient> appConnecter;
    appConnecter->stop();
}

void Perfectlum4::cleanAll()
{
    m_mainDialog.reset(nullptr);
    stopCalibrationThreads();
    SingletonPointer<BaseDataPool>().reset();
    DB::free();
    Logging::releaseMessageOutput();
}

bool Perfectlum4::checkFlags()
{
    uint argCount = m_args.count();
    if (argCount >= 2){
        QString argKey = m_args[1];

        if (argKey == "GCReaction" || argKey == "removekeys"
            || argKey == "install" || argKey == "is_remote"
            || argKey == "backup"  || argKey == "synchronize")
            return true;

        if (argCount == 3)
            if (argKey == "configure" || argKey == "backlight" || argKey == "whitelevelstab")
                return true;

        if (argCount == 4)
            if (argKey == "runusr"    || argKey == "runqa"     || argKey == "registration")
                return true;

        if (argCount >= 6 && argKey == "remote")
            return true;
    }

    return false;
}

void Perfectlum4::timer_run_qa()
{
    DBPreferences dbprefs;
    m_mainDialog.reset(new MainWindow(nullptr, false));
    SingletonPointer<PipeAppConnectorClient> appConnecter;
    appConnecter->sendMessage(APP_CONNECTER_LUTLOADER_DISABLE, "1");
    SingletonPointer<SchedulingThread> schedulingThread;

    Qbx::ProcessResult res = TaskRunner::QATask(m_args, m_mainDialog.get());
    if (res == Qbx::ProcessResult::Ok || res == Qbx::ProcessResult::Failed){
        schedulingThread->start();
        schedulingThread->wait();
    }

    qDebug() << m_args;

    appConnecter->sendMessage(APP_CONNECTER_LUTLOADER_DISABLE, "0");
    appConnecter->sendMessage("regenTables", "1");

    // wait for report
    while(QubyxNCReport::activeReports() )
        SleepThread::sleep(100);
    QubyxNCReport::cleanTempFiles();

    QString lang=dbprefs["Language"];

    synchronizeDatabase();

    if (lang!=dbprefs["Language"]){
        qDebug() << "?? Language changed";
        appConnecter->sendMessage("retranslate", "");
        SleepThread::sleep(100);
    }

    quit();
}

void Perfectlum4::timer_run_usr()
{
    DBPreferences dbprefs;
    SingletonPointer<PipeAppConnectorClient> appConnecter;

    if (m_args.size() >= 5)
        TaskRunner::SetCheckDisplayMode(m_args[4]);

    SingletonQtPointer<WaitDialog> wdlg;
    appConnecter->sendMessage(APP_CONNECTER_LUTLOADER_DISABLE, "1");
    wdlg->showOnParent(nullptr);

    int r = int (TaskRunner::UserTask(m_args[3].toInt(), m_mainDialog.get()));
    qDebug() << "TaskRunner::UserTask" << r;

    appConnecter->sendMessage(APP_CONNECTER_LUTLOADER_DISABLE, "0");
    appConnecter->sendMessage("regenTables", "1");

    // wait for report
    while (QubyxNCReport::activeReports())
        SleepThread::sleep(100);
    QubyxNCReport::cleanTempFiles();

    QString lang = dbprefs["Language"];

    synchronizeDatabase();

    if (lang != dbprefs["Language"]){
        qDebug() << "?? Language changed";
        appConnecter->sendMessage("retranslate", "");
        SleepThread::sleep(100);
    }

    cleanAll();
    wdlg->hide();
    quit();
}

int Perfectlum4::handleArguments()
{
    if (not checkFlags()){
        if (isRunning()){
            qDebug() << "PerfectLum4 already running";
            SingletonPointer<PipeAppConnectorClient> appConnecter;
            appConnecter->sendMessage(APP_CONNECTER_RAISE_MAIN_WINDOW, "");
            return 0;
        }

        showSplash();
        return -1;
    }

    qDebug() << "handleArguments(), m_args ="<< m_args;
    uint argCount = m_args.count();
    QString argKey;
    if (m_args.size() > 1)
        argKey = m_args[1];
    else
        return -1;

    if (argKey == "is_remote")
        return arg_is_remote();

    if (argKey == "GCReaction")
        arg_gc_reaction();

    else if (argKey == "removekeys")
        arg_removekeys();

    else if (argCount == 2 && argKey == "install")
        arg_install();

    else if (argCount >= 6 && argKey == "remote")
        arg_remote();

    else
        return -1;

    return 0;
}

bool Perfectlum4::handleArguments_2()
{
    QStringList args = m_args;
    qDebug() << args;
    if (args.length() <= 1)
        return true;

    qDebug() << "handleArguments_2(), args: "<< args;
    uint argCount = args.count();
    QString argKey = args[1];

    if (argCount >= 4 && argKey == "runusr"){
        arg_run_usr();
        return false;
    }

    if (argCount >= 4 && argKey == "runqa"){
        arg_run_qa();
        return false;
    }

    if (argCount >= 3 && argKey == "backlight"){
        arg_backlight();
        return false;
    }

    if (argCount >= 3 && argKey == "whitelevelstab"){
        arg_whitelevelstab();
        return false;
    }

    return true;
}

void Perfectlum4::initLogs()
{
//#ifndef QT_DEBUG
    //    QString logPath = applicationSettings.GetDataBasePath();
    QString logPath = settings.GetDataBasePath();
#ifdef Q_OS_WIN
    WindowsDDCCIControl::startLog((logPath+"logd.qlog").toLatin1().data());
#endif
    Logging::prepareMessageOutput(logPath, "loga.qlog");
    Logging::prepareMessageOutput(logPath, "info.qlog", 20, QtInfoMsg);
//#endif
}

void Perfectlum4::initLibraryPath()
{
#ifdef Q_OS_WIN
#ifndef QT_DEBUG
//    qApp.setLibraryPaths(QStringList());
#endif
    qApp->addLibraryPath(qApp->applicationDirPath()+"/plugins");
#endif
}

void Perfectlum4::refreshDisplays()
{
    if (GlobalData::getString(GLOBALDATA_GUIVIEW).contains(GLOBALDATA_GUIVIEW_HIDEDISP))
    {
        DBUtils::RefreshDisplaysInfo(DisplayFactory::EnumerateCannonSerials());
        DBUtils::updateSerialPorts(DBUtils::EnumerateCannonPorts(DisplayFactory::EnumerateCannonSerials()));
    }
    else
        DBUtils::RefreshDisplaysInfo();
}

bool Perfectlum4::initRegistration()
{
    auto regInst = CurrentRegistration::GetRegistrationInstance();

    if (regInst->IsRegister(Registration::LICENSE_OLORIN)
        || regInst->IsRegister(Registration::LICENSE_OLORIN_CALIBRATION)
        || regInst->IsRegister(Registration::LICENSE_OLORIN_QA))
        if (!DisplayFilter::findOlorinDisplay())
            InfoDialog::showInformation(nullptr, tr("No Olorin Display detected. "
                                                    "The software will only launch with "
                                                    "an Olorin display connected!"));

    if (regInst->IsRegister(Registration::LICENSE_TOTOKU_QA))
        if (!DisplayFilter::findTotokuDisplay()){
            InfoDialog::showInformation(nullptr, tr("You are running a Totoku version of the product. You can't use applicaiton with this display."));
            cleanAll();
            return false;
        }

    return true;
}

void Perfectlum4::setStyleAndFonts()
{
    QApplication::setStyle(new QubyxStyle());
    qApp->setStyleSheet(UsefulTools::GetStyleData(":/style/style.css", ":/style/DataMap.xml"));

#ifdef QT_DEBUG
    QStringList dynamicStyleFiles;
    dynamicStyleFiles << "../../../../perfectlum4/perfectlum/style/style.css";
    QDynamicStyle dynamicStyle(dynamicStyleFiles, "../../../../perfectlum4/perfectlum/style/DataMap.xml");
#endif

    qApp->setApplicationName(GlobalData::getString(GLOBALDATA_APPLICATION_NAME));

    //set special font for mac os x
#ifdef Q_OS_MAC
    int id = QFontDatabase::addApplicationFont(":/rc/GenEiAntiqueP-Medium.otf");
    QStringList list = QFontDatabase::applicationFontFamilies(id);
    if (list.count()>0)
        qApp->setFont(QFont(list.at(0), 11));
#endif

//    int idRoboto = QFontDatabase::addApplicationFont("://rc/Roboto-Regular.ttf");
//    QString family = QFontDatabase::applicationFontFamilies(idRoboto).at(0);
//    QFont monospace(family);
//    monospace.setPixelSize(13);
//    QApplication::setFont(monospace);
}

void Perfectlum4::showWindow()
{
    auto orgName = GlobalData::getString(GLOBALDATA_ORGANIZATION_NAME);
    auto appName = GlobalData::getString(GLOBALDATA_APPLICATION_NAME);
    auto appPath = GlobalData::getString(GLOBALDATA_APPLICATION_NAME_PATH);

    m_mainDialog.reset(new MainWindow);
    const QString windowTitle = orgName + " " + appName;
    m_mainDialog->setWindowTitle(windowTitle);
    QSettingsWithSharing settings(QSettings::NativeFormat, QSettings::SystemScope, orgName, appPath);
    if (!settings.value(GEOMETRY_MAIN_WINDOW).isNull())
    {
        QSize oldSize = m_mainDialog->size();
        m_mainDialog->restoreGeometry(settings.value(GEOMETRY_MAIN_WINDOW).toByteArray());
        m_mainDialog->resize(oldSize);
    }

    m_mainDialog->show();
//    m_mainDialog->move(0, 0);
}

bool Perfectlum4::showSplash()
{
    if (m_splash)
        m_splash->deleteLater();

    bool showSplash = false; // !app.isRunning() && app.arguments().size() == 1;
    if (showSplash){
        QPixmap pixmap(":rc/images/splash_background.png");
        QPainter painter(&pixmap);
        painter.setPen(Qt::white);

        QString copyright = GlobalData::getString(GLOBALDATA_ORGANIZATION_NAME);
        if (!GlobalData::getString(GLOBALDATA_COPYRIGHT_COMPANY_NAME).isEmpty())
            copyright = GlobalData::getString(GLOBALDATA_COPYRIGHT_COMPANY_NAME);

        copyright += (QString(QChar(0x00A9)) + " Copyright 2002 - "
                      +  QString::number(QDate::currentDate().year()));

        m_splash = new QSplashScreen(pixmap);

        m_splash->show();
        m_splash->raise();
        qApp->processEvents();
    }
    return showSplash;
}

void Perfectlum4::hideSplash()
{
    if (m_splash)
        m_splash->hide();
}

void Perfectlum4::arg_run_qa()
{
    setQuitOnLastWindowClosed(false);
    QubyxSharedMemory scheduleSharedMemory(SHARED_MEMORY_KEY_SCHEDULING.toStdString(), "runqa", 0, false);

    if (scheduleSharedMemory.IsLocked()){
        qDebug()<<"runqa. Scheduling sharedmemory grabbed - stops";
        return;
    }

    QTimer::singleShot(100, this, &Perfectlum4::timer_run_qa);
    exec();
}

void Perfectlum4::arg_run_usr()
{
    setQuitOnLastWindowClosed(false);
    qDebug()<<"PerfectLUm console Pid - "<<QCoreApplication::applicationPid();
    m_mainDialog.reset(new MainWindow(nullptr, false));

    QTimer::singleShot(100, this, &Perfectlum4::timer_run_usr);
    exec();
}

void Perfectlum4::arg_backlight()
{
    qDebug()<<"BackLight pf run!";
    m_mainDialog.reset(new MainWindow(nullptr, false));

    int displayId = m_args[2].toInt();

    DBBacklightRemindTime dblrTime;
    if (dblrTime.BacklightGetTime(displayId) <= int(QDateTime::currentDateTime().toTime_t()))
        TaskRunner::ProgramTask(BackLightStab,displayId, m_mainDialog.get());
    else
        qDebug()<<"Backlight canceled!";
}

void Perfectlum4::arg_whitelevelstab()
{
    qDebug()<<"whitelevelstab pf run!";
    m_mainDialog.reset(new MainWindow(nullptr, false));

    int displayId = m_args[2].toInt();
    int r = int(TaskRunner::ProgramTask(WhiteLevelStab, displayId, m_mainDialog.get()));
    qDebug() << "TaskRunner::whitelevelstab" << r;
}

void Perfectlum4::arg_gc_reaction()
{
    qDebug() << "PerfectLum GCReaction - no reaction";
}

void Perfectlum4::arg_removekeys()
{
    qDebug()<<"Remove All register keys;";
    CurrentRegistration::GetRegistrationInstance()->ClearRegisterKeys();

    LastLicenses::setLastLicense(LastLicenseCalibration, "");
    LastLicenses::setLastLicense(LastLicenseQA, "");
    LastLicenses::setLastLicense(LastLicensePrinter, "");
    LastLicenses::setLastLicense(LastLicenseCamera, "");
}

void Perfectlum4::arg_install()
{
    qDebug() << "void Perfectlum4::arg_install() begin";
    //activate ddcci
    OSUtils::DDCCI::install(applicationDirPath().toLatin1().data());

    //create files and put permissions
    QubyxDisplayProfile prof(1,"","");  //will create profile catalog for Mac OS
    settings.InitCatalogs();     //will create catalogs for user regulations and for translations

    DBPreferences pref;
    AppInitialization::registertypes();
    AppInitialization::checkDB();
    AppInitialization::fillStaticDataFromDB();
    AppInitialization::initMinolta();

    qApp->setApplicationName(GlobalData::getString(GLOBALDATA_APPLICATION_NAME));
    settings.RenewIfWasError();

    RegulationList::RefreshRegulationList(":rc/regulations");

    {
        DBDisplays displ;
        CurrentDisplays::NonCachedRefresh();
        for(int dispIdx = CurrentDisplays::DisplayCount() - 1; dispIdx >= 0 ; dispIdx--)
            qDebug() << dispIdx << displ.getRealModel(dispIdx) << displ.getLeft(dispIdx)
                     << displ.getTop(dispIdx) << displ.getWidth(dispIdx) << displ.getHeight(dispIdx);
        // actual goal of all these is just to create table Displays;
        // output to qDebug is for extra-ensure that all these will not be optimized as unused
    }
    {
        BaseDataPool pool;
        pool.init();
        pool.initDB();
    }
    {
        DBSettingsNames setNames;
        QubyxDynamicData::iterator it = setNames.GetSettings();
        while(!(it.IsNull())) {
            qDebug() << it.values().size();
            it++;
        }
        qDebug() << setNames.GetSettingsMapStr("Language");
        qDebug() << setNames.GetSettingsMapStr("CalibrationType");
        // actual goal of all these is just to create table SettingsNames;
        // output to qDebug is for extra-ensure that all these will not be optimized as unused
    }
    {
        DBCalHistory calHist;
        qDebug() << calHist.getTargets(1).size();
        // actual goal of all these is just to create table CalTargets;
        // output to qDebug is for extra-ensure that all these will not be optimized as unused
    }
    {
        DBHistoryQAScheduling histQA;
        qDebug() << histQA.TEST_NAME; // ???
    }

    if (OSUtils::isAnyOfProcessesRuns({"DCalibrator.exe", "DellTray.exe",
                                       "i1ProfilerTray.exe", "Spyder3Utility.exe",
                                       /*"LUTLoader.exe",*/ "SpyderUtility.exe",
                                       "QuatoCalibrationLoader.exe",
                                       "CalibrationLoader.exe",
                                       "ColorMunki Photo Tray.exe",
                                       "MonacoGamma.exe", "CalPC Client.exe"}) == OSUtils::FoundStatus) {
        qDebug() << "Other calibration software detected!";
        QApplication::setStyle(new QubyxStyle());

        setStyleSheet(UsefulTools::GetStyleData(":/style/style.css", ":/style/DataMap.xml"));
        InfoDialog::showWarning(nullptr, tr("Warning: Other calibration software is installed on your computer. "
                                            "It might cause conflicts and errors that influence both applications' workflow."),
                                false);
    }

    qDebug() << "void Perfectlum4::arg_install() end";
}

int Perfectlum4::arg_is_remote()
{
    DBPreferences prefs;
    if (prefs.getValue(IS_REMOTE_ON) != REMOTE_ON)
        return 0;
    else
        return 1;
}

void Perfectlum4::arg_remote()
{
    NetworkSettings nwSettings;
    DBPreferences dbprefs;

    if (dbprefs.getValue("UseProxy") == "true")
        nwSettings = DBUtils::getNetworkSettingsFromDB(); // used only for proxy settings

    nwSettings.serverName = m_args[2];
    nwSettings.userName   = m_args[3];
    nwSettings.password   = m_args[4];
    nwSettings.workstationId = dbprefs.GetSynchronizeWorkstationId();

    RemoteConnecter remoteConnecter(nwSettings, m_args[5]);
    QString result = remoteConnecter.ActivateRemote();
    qDebug() << "Result of remote activation - " << result;

    if (m_args.size() == 7) {
        QFile file(m_args[6]);

        if (file.open(QIODevice::WriteOnly | QIODevice::Append | QIODevice::Text)){
            file.write(result.toLatin1());
            file.close();
        }
    }
}
