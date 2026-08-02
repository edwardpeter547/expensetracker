
export const getBaseUrl = () => {
    if(__DEV__) {
        return `http://${window.location.hostname || 'localhost'}:7000/api/v1`
    //     if(Platform.OS == "android"){
            
    //     }
    }
    return 'https://your-production-api.com/api/v1';
}