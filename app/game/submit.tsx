import { ActivityIndicator, LayoutAnimation, ScrollView, View } from "react-native";
import { NavBar } from "../../lib/components/NavBar";
import { IconButton } from "../../lib/components/IconButton";
import { colors } from "../../lib/colors";
import { SafeAreaView } from "react-native-safe-area-context";
import TitleMedium from "../../lib/components/text/TitleMedium";
import BodyMedium from "../../lib/components/text/BodyMedium";
import Button from "../../lib/components/Button";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { reportStateAtom } from "../../lib/collection/reportStateAtom";
import { MatchIdentityLocalizationFormat, localizeMatchIdentity } from "../../lib/models/match";
import { Suspense, useEffect, useState } from "react";
import { ScoutReport } from "../../lib/collection/ScoutReport";
import { exportScoutReport } from "../../lib/collection/ReportState";
import QRCode from 'qrcode';
import { SvgXml } from "react-native-svg";
import { router } from "expo-router";
import { uploadReport } from "../../lib/lovatAPI/uploadReport";
import { Icon } from "../../lib/components/Icon";
import { historyAtom, useAddMatchToHistory } from "../../lib/storage/historyAtom";
import { ScoutReportMeta } from "../../lib/models/ScoutReportMeta";
import { ResizableQRCode, ScoutReportCode } from "../../lib/collection/ui/ScoutReportCode";
import { StatusBar } from "expo-status-bar";

export default function Submit() {
    const [reportState, setReportState] = useAtom(reportStateAtom);
    const [scoutReport, setScoutReport] = useState<ScoutReport | null>(null);

    const [uploaded, setUploaded] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [uploadError, setUploadError] = useState(false);

    const [uploadState, setUploadState] = useState(UploadState.None);

    useEffect(() => {
        if (uploading) {
            setUploadState(UploadState.Uploading);
        } else if (uploaded) {
            setUploadState(UploadState.Uploaded);
        } else if (uploadError) {
            setUploadState(UploadState.Error);
        } else {
            setUploadState(UploadState.None);
        }
    }, [uploaded, uploading, uploadError]);

    useEffect(() => {
        if (scoutReport && !uploaded && !uploading && !uploadError) {
            setUploading(true);

            uploadReport(scoutReport)
                .then(() => {
                    setUploading(false);
                    setUploaded(true);
                })
                .catch((e) => {
                    console.error(e);
                    setUploading(false);
                    setUploadError(true);
                })
        }
    }, [scoutReport]);

    useEffect(() => {
        if (reportState) {
            setScoutReport(exportScoutReport(reportState));
        }
    }, [reportState]);

    return (
        <>
            <NavBar
                title={`${reportState!.meta.teamNumber} in ${localizeMatchIdentity(reportState!.meta.matchIdentity, MatchIdentityLocalizationFormat.Short)}`}
            />
            <SafeAreaView edges={['bottom', 'left', 'right']} style={{ flex: 1, gap: 7 }}>
                <View style={{ flex: 1, paddingVertical: 16 }}>
                    {scoutReport && <ScoutReportCode scoutReport={scoutReport!} />}

                    <View style={{ paddingHorizontal: 26, flex: 1 }}>
                        <UploadIndicator state={uploadState} />
                        <View
                            style={{
                                flex: 1,
                                justifyContent: 'flex-end',
                            }}
                        >
                            <Suspense fallback={<Button variant="primary" disabled>Done</Button>}>
                                {scoutReport && <DoneButton scoutReport={scoutReport!} uploadState={uploadState} meta={reportState!.meta} />}
                            </Suspense>
                        </View>
                    </View>
                </View>
            </SafeAreaView>
        </>
    );
}

const DoneButton = ({ scoutReport, uploadState, meta }: { scoutReport: ScoutReport; uploadState: UploadState, meta: ScoutReportMeta }) => {
    const setReportState = useSetAtom(reportStateAtom);
    const addMatchToHistory = useAddMatchToHistory();

    return (
        <Button variant="primary" onPress={() => {
            addMatchToHistory(scoutReport, uploadState === UploadState.Uploaded, meta);
            router.replace('/');
            setReportState(null);
        }}>
            Done
        </Button>
    )
}

enum UploadState {
    None,
    Uploading,
    Uploaded,
    Error,
}

const UploadIndicatorInner = ({ state }: { state: UploadState }) => {
    switch (state) {
        case UploadState.None:
            return null;
        case UploadState.Uploading:
            return <BodyMedium>Uploading</BodyMedium>;
        case UploadState.Uploaded:
            return <BodyMedium>Uploaded</BodyMedium>;
        case UploadState.Error:
            return <BodyMedium color={colors.danger.default}>Upload failed</BodyMedium>;
    }
}

const UploadIndicator = ({ state }: { state: UploadState }) => {
    const [effectiveState, setEffectiveState] = useState(state);

    useEffect(() => {
        if (state === effectiveState) return;

        LayoutAnimation.configureNext({
            duration: 500,
            create: {
                type: 'linear',
                property: 'opacity',
                duration: 200,
            },
            update: {
                type: 'spring',
                springDamping: 0.6,
            },
            delete: {
                type: 'linear',
                property: 'opacity',
                duration: 200,
            },
        });
        setEffectiveState(state);
    }, [state]);

    return (
        <View
            style={{
                flexDirection: 'row',
                justifyContent: 'center'
            }}
        >
            <View
                style={{
                    marginTop: 14,
                    paddingVertical: 4,
                    paddingLeft: 7,
                    paddingRight: effectiveState === UploadState.None ? 7 : 10,
                    borderRadius: 100,
                    backgroundColor: colors.secondaryContainer.default,
                    justifyContent: 'center',
                    alignItems: 'center',
                    gap: effectiveState === UploadState.Uploading ? 6 : 2,
                    flexDirection: 'row',
                    height: 30,
                    minWidth: 30,
                    overflow: 'hidden',
                }}
            >
                <View
                    style={{
                        height: 18,
                        width: 18,
                        justifyContent: 'center',
                        alignItems: 'center',
                    }}
                >
                    {effectiveState === UploadState.None && <ActivityIndicator size="small" color={colors.onBackground.default} />}
                    {effectiveState === UploadState.Uploading && <ActivityIndicator size="small" color={colors.onBackground.default} />}
                    {effectiveState === UploadState.Uploaded && <Icon name="check" color="#44ca6c" size={16} />}
                    {effectiveState === UploadState.Error && <Icon name="error" color={colors.danger.default} size={16} />}
                </View>
                <UploadIndicatorInner state={effectiveState} />
            </View>
        </View>
    );
};
