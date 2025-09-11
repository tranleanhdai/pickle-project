import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import HomeScreen from './src/screens/HomeScreen';
import VenueScreen from './src/screens/VenueScreen';
import CourtScreen from './src/screens/CourtScreen';
import BookingScreen from './src/screens/BookingScreen';
import { Provider as PaperProvider } from 'react-native-paper';

const Stack = createNativeStackNavigator();
const queryClient = new QueryClient();

export default function App() {
  return (
    <PaperProvider>
      <QueryClientProvider client={queryClient}>
        <NavigationContainer>
          <Stack.Navigator>
            <Stack.Screen name="Home" component={HomeScreen} />
            <Stack.Screen name="Venue" component={VenueScreen} />
            <Stack.Screen name="Court" component={CourtScreen} />
            <Stack.Screen name="Booking" component={BookingScreen} />
          </Stack.Navigator>
        </NavigationContainer>
      </QueryClientProvider>
    </PaperProvider>
  );
}
