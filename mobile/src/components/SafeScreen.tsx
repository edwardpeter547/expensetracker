import useTheme from '@/hooks/useTheme'
import { childrenNodes } from '@/types/Common'
import { View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

const SafeScreen = ({children}: childrenNodes) => {

    const insets = useSafeAreaInsets();
    const { colors } = useTheme();

  return (
    <View style={{paddingTop: insets.top, flex: 1, backgroundColor: colors.background}}>
      {children}
    </View>
  )
}

export default SafeScreen