import { Slot, SplashScreen } from "expo-router";
import { NativeModules, View } from "react-native";
import { colors } from "../lib/colors";

import {
    useFonts,
    Heebo_400Regular,
    Heebo_500Medium,
    Heebo_600SemiBold,
    Heebo_700Bold,
} from "@expo-google-fonts/heebo";

import { useCallback, useEffect, useState } from "react";
import { LoadServicesContext, ServiceValues, ServicesContext, services } from "../lib/services";
import { LocalCache } from "../lib/localCache";

import TimeAgo from "javascript-time-ago";
import en from 'javascript-time-ago/locale/en.json'
import { useSetAtom } from "jotai";
import { ScouterSchedule, scouterScheduleAtom } from "../lib/storage/scouterSchedules";

const {UIManager} = NativeModules;

UIManager.setLayoutAnimationEnabledExperimental &&
    UIManager.setLayoutAnimationEnabledExperimental(true);

TimeAgo.addDefaultLocale(en);

SplashScreen.preventAutoHideAsync();

export default function Layout() {
    const [fontsLoaded, fontError] = useFonts({
        Heebo_400Regular,
        Heebo_500Medium,
        Heebo_600SemiBold,
        Heebo_700Bold,
        MaterialSymbols_500Rounded: require("../assets/fonts/Material-Symbols-Rounded.ttf"),
        MaterialSymbols_500Rounded40px: require("../assets/fonts/Material-Symbols-Rounded-40px.ttf"),
        MaterialSymbols_500Rounded48px: require("../assets/fonts/Material-Symbols-Rounded-48px.ttf"),
    });

    const setScouterSchedule = useSetAtom(scouterScheduleAtom);

    const onLayoutRootView = useCallback(async () => {
        if (fontsLoaded || fontError) {
            await SplashScreen.hideAsync();
        }
    }, [fontsLoaded, fontError]);

    const [serviceValues, setServiceValues] = useState<ServiceValues>({
        teamScouters: null,
        tournaments: null,
        scouterSchedule: null,
    });

    const loadServices = () => Promise.allSettled(services.map(async service => {
        try {
            console.log(`Loading service ${service.id}`);
            const value = await service.get();

            setServiceValues((values) => ({
                ...values,
                [service.id]: value,
            }));

            if (service.id === "scouterSchedule") {
                setScouterSchedule(async () => value as LocalCache<ScouterSchedule>);
                console.log(`Loaded scouter schedule ${value.data.hash}`);
            }
            console.log(`Loaded service ${service.id}`);
        } catch (e) {
            console.error(`Failed to load service ${service.id}`);
            console.error(e);
        }
    }));

    useEffect(() => {
        loadServices();

        const interval = setInterval(loadServices, 2 * 60 * 1000);

        return () => clearInterval(interval);
    }, []);

    if (!fontsLoaded && !fontError) {
        return null;
    }

    return (
        <ServicesContext.Provider value={serviceValues}>
            <LoadServicesContext.Provider
                value={async () => {
                    await loadServices();
                }}
            >
                <View style={{ backgroundColor: colors.background.default, flex: 1 }} onLayout={onLayoutRootView}>
                    <Slot />
                </View>
            </LoadServicesContext.Provider>
        </ServicesContext.Provider>
    );
}
