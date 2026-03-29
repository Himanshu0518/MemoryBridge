// Central barrel — import all service hooks from here
export { api } from "./api";

export {
  userApi,
  useSignupMutation,
  useLoginMutation,
  useLogoutMutation,
  useGetMeQuery,
  useUpdateMeMutation,
  useChangePasswordMutation,
  useDeleteMeMutation,
} from "./userApi";

export {
  patientApi,
  useGetPatientsQuery,
  useGetPatientQuery,
  useCreatePatientMutation,
  useUpdatePatientMutation,
  useDeletePatientMutation,
  useGetPersonsQuery,
  useCreatePersonMutation,
  useUpdatePersonMutation,
  useDeletePersonMutation,
} from "./patientApi";

export {
  recognitionApi,
  useStoreKnownFaceMutation,
  useMatchFaceMutation,
  useGetKnownPersonsQuery,
  useStoreUnknownFaceMutation,
} from "./recognitionApi";
