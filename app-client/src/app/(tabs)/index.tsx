

import { Text, View } from 'react-native';

import "@/global.css";

import { Button } from '@/components/ui/button';
import { Text as TextUI } from '@/components/ui/text';



export default function HomeScreen() {
  return (
    <View className='flex-1 items-center justify-center'>
      <Button className='bg-blue-500 p-4'>
        <TextUI>Home</TextUI>
      </Button>
    </View>
  );
}

