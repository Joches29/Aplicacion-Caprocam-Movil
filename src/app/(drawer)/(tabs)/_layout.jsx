import { Tabs } from "expo-router";
import { Drawer } from "expo-router/drawer";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";

import { ICONS } from "../../../theme/icons";
import { COLORS } from "../../../theme/colors";

import Icon from "../../../shared/components/Icons";

export default function TabsLayout() {
  return (

    <Tabs screenOptions={{ tabBarActiveTintColor: "teal", headerShown: false }}>
      <Tabs.Screen
        name="inicio"
        options={{
          tabBarIcon: ({ color, size }) => (
            <Icon icon={ICONS.dashboard} color={color} size={20} />
          ),
          tabBarActiveTintColor: COLORS.primary,
          tabBarLabel: "Inicio",
          title: "Home",
        }}
      />

      <Tabs.Screen
        name="registros"
        options={{
          // Al salir de la pestaña, reinicia el stack de registros a su
          // pantalla inicial. Sin esto, si el usuario entra a un
          // sub-registro (ej. Alimentacion), cambia de seccion y vuelve
          // a Registros, la app lo devuelve dentro del sub-registro en
          // lugar del menu principal (hallazgo de QA: "Retorno
          // incorrecto en la navegacion").
          popToTopOnBlur: true,
          tabBarIcon: ({ color, size }) => (
            <Icon icon={ICONS.document} color={color} size={20} />
          ),
          tabBarActiveTintColor: COLORS.primary,
          tabBarLabel: "Registros",
          title: "Registros",
        }}
      />

      <Tabs.Screen
        name="siembra"
        options={{
          tabBarIcon: ({ color, size }) => (
            <Icon icon={ICONS.shrimp} color={color} size={20}
            />
          ),
          tabBarActiveTintColor: COLORS.primary,
          tabBarLabel: "Siembra",
          title: "Siembra",
        }}
      />   
      <Tabs.Screen name="colaboradores" options={{ drawerItemStyle: { display: "none" } }} />
    </Tabs>

  );
}