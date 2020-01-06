exports.handler = async(context, event, callback) =>{
    
    const {CurrentTask} = event;

    //calling task handlers
    switch(CurrentTask){

        case 'greeting' :
            await greetingHandler(context, event, callback);
            break;

        case 'book_appointments' :
            await bookAppointmentsHandler(context, event, callback);
            break;

        case 'list_appointments' :
            await listAppointmentsHandler(context, event, callback);
            break;

        case 'cancel_appointments' :
            await cancelAppointmentsHandler(context, event, callback);
            break;

        case 'change_appointments' :
            await changeAppointmentsHandler(context, event, callback);
            break;

        case 'complete_booking' :
            await completeBookingHandler(context, event, callback);
            break;

        case 'complete_change_appointment' :
            await completeChangeAppointmentHandler(context, event, callback);
            break;

        case 'get_appointment_id' :
            await getAppointmentIdHandler(context, event, callback);
            break;

        case 'goodbye' :
            await goodbyeHandler(context, event, callback);
            break;

        case 'collect_fallback' :
            await collectFallbackHandler(context, event, callback);
            break;

        case 'fallback' :
            await fallbackHandler(context, event, callback);
            break;

        default :
            await fallbackHandler(context, event, callback);
    } 
};

//greeting handler function
const greetingHandler = async (context, event, callback) => {

    const Say = 'Thanks for contacting our store! I can help you book a new appointment, modify an existing one or tell you about upcoming appointments. How can I help you today?',
          Listen = true,
          Remember = false,
          Collect = false,
          Tasks = false;

    speechOut(Say, Listen, Remember, Collect, Tasks, callback);
}

//book_appointments handler function
const bookAppointmentsHandler = async (context, event, callback) => {

    const Say = 'Okay lets get you a new appointment. I just need you to answer a few questions.',
          Listen = false,
          Remember = false,
          Collect = {
            "on_complete" : {
                "redirect" : "task://complete_booking"
            },
            "name" : "schedule_appt",
            "questions" : [
                {
                    "type" : "Twilio.DATE",
                    "question" : "Please tell me the date you want to come in.",
                    "name" : "appt_date",
                    "prefill" : "ApptDate"
                },
                {
                    "type" : "Twilio.TIME",
                    "question" : "Thanks, and what time?",
                    "name" : "appt_time",
                    "prefill" : "ApptTime"
                },
                {
                    "type" : "Twilio.PHONE_NUMBER",
                    "question" : "Awesome, last question. What is the best number to reach you on?",
                    "name" : "appt_phone_number"
                }
            ]
        },
        Tasks = false;

    speechOut(Say, Listen, Remember, Collect, Tasks, callback);
}

//list_appointments handler function
const listAppointmentsHandler = async (context, event, callback) => {

    const moment = require('moment');

    const Appointments = JSON.parse(event.Memory).Appointments || [];

    let Say = 'You have no upcoming appointments. I can always help you to book a new appointment.',
        Listen = true,
        Remember = false,
        Collect = false,
        Tasks = false;

    for(const [i, v] of Appointments.entries()){

        const {Date, Time, Phone_no} = v,
              datetime = `${Date} ${Time.replace(/:/g, '')}`,
              formated_date = moment(datetime, 'YYYY-MM-DD hmm').format('MMMM Do'),
              formated_time = moment(datetime, 'YYYY-MM-DD hmm').format('h:mm a');
        if(Appointments.length > 1){

            if(i === 0)
                Say = `Your upcoming appointments are on ${formated_date} at ${formated_time}`;
            else if(i === Appointments.length - 1)
                Say += ` and ${formated_date} at ${formated_time}. I can always help you reschedule or cancel it.`;
            else
                Say += `, ${formated_date} at ${formated_time}`;    
        }
        else{
            Say = `Your next appointment is on ${formated_date} at ${formated_time}. I can always help you reschedule or cancel it.`
        }
    }
    speechOut(Say, Listen, Remember, Collect, Tasks, callback);
}

//cancel_appointments handler function
const cancelAppointmentsHandler = async (context, event, callback) => {

    let Appointments = JSON.parse(event.Memory).Appointments || [],
        Say = 'You have no appointment to cancel. I can help you to book a new appointment.',
        Listen = true,
        Remember = false,
        Collect = false,
        Tasks = ["book_appointments"];

    if(Appointments.length){

        if(Appointments.length > 1){
            Say = `Okay, please tell me the appointment Id you want to cancel?`;
            Tasks = ["get_appointment_id"];
            Remember = {
                "Appointments" : Appointments,
                "LastTask" : "cancel_appointments"
            };
        }else
        {
            Appointments.pop();
            Remember = {
                "Appointments" : Appointments
            };
            Say = `Okay I've cancelled your appointment. What else can I help you with?`;
            Tasks = [
                "book_appointments",
                "list_appointments",
                "goodbye"
            ];
        }
    }

    // collect object is set to false
    speechOut(Say, Listen, Remember, Collect, Tasks, callback);
}

//change_appointments handler function
const changeAppointmentsHandler = async (context, event, callback) => {

    const Appointments = JSON.parse(event.Memory).Appointments || [];
    let Say = 'You have no appointments to reshedule. I can always help you to book a new appointment.',
        Listen = true,
        Remember = false,
        Collect = false,
        Tasks = ["book_appointments"];

    if(Appointments.length){

        if(Appointments.length > 1){

            Say = `Okay, please tell me the appointment Id you want to reshedule?`;
            Tasks = ["get_appointment_id"];
            Remember = {
                    "Appointments" : Appointments,
                    "LastTask" : "change_appointments"
            };
        }else{

            Listen = false;
            Remember = {
                "Appointments" : Appointments
            };
            Say = `Okay lets reschedule your appointment. I just need you to answer a few questions.`;
            Collect = {
                "on_complete" : {
                    "redirect" : "task://complete_change_appointment"
                },
                "name" : "reschedule_appt",
                "questions" : [
                    {
                        "type" : "Twilio.DATE",
                        "question" : "Please tell me the date you want to come in.",
                        "name" : "appt_date",
                        "prefill" : "ApptDate"
                    },
                    {
                        "type" : "Twilio.TIME",
                        "question" : "Thanks, and what time?",
                        "name" : "appt_time",
                        "prefill" : "ApptTime"
                    }
                ]
            };
        }
    }
          
    speechOut(Say, Listen, Remember, Collect, Tasks, callback);
}

//complete_booking handler function
const completeBookingHandler = async (context, event, callback) => {

    let Memory = JSON.parse(event.Memory);
    const {appt_date, appt_time, appt_phone_number} = Memory.twilio.collected_data.schedule_appt.answers,
          appt_id = new Date().valueOf();

    let Appointments = Memory.Appointments || [];
    Appointments.push({
        "Id" : appt_id,
        "Date" : appt_date.answer,
        "Time" : appt_time.answer,
        "Phone_no" : appt_phone_number.answer
    });

    const Say = `Thanks! I've booked your appointment with appointment ID ${appt_id}. See you soon :)`,
          Listen = true,
          Remember = {
              "Appointments" : Appointments
          },
          Collect = false,
          Tasks = false;

    speechOut(Say, Listen, Remember, Collect, Tasks, callback);
}

//complete_change_appointment handler function
const completeChangeAppointmentHandler = async (context, event, callback) => {

    const moment = require('moment');
    let Memory = JSON.parse(event.Memory),
        {appt_date, appt_time} = Memory.twilio.collected_data.reschedule_appt.answers,
        datetime = `${appt_date.answer} ${appt_time.answer.replace(/:/g, '')}`,
        formated_date = moment(datetime, 'YYYY-MM-DD hmm').format('MMMM Do'),
        formated_time = moment(datetime, 'YYYY-MM-DD hmm').format('h:mm a'),
        {ApptId, Appointments} = Memory,
        Remember = {
            "Appointments" : Appointments
        },
        Say = `Appointment with ${ApptId}, please check your appointment Id. What else can I help you with?`,
        Listen = true,
        Collect = false,
        Tasks = false;

    const index = Appointments.length === 1 ? 0 : Appointments.findIndex(elem => {
        return elem.Id.toString() === ApptId
    });

    if(index !== -1){
        Appointments[index].Date = appt_date.answer;
        Appointments[index].Time = appt_time.answer;
        Remember.Appointments = Appointments;
        Say = `Okay I've changed your appointment to ${formated_date} at ${formated_time}. What else can I help you with?`;
    }
          
    speechOut(Say, Listen, Remember, Collect, Tasks, callback);
}

//get_appointment_id handler function
const getAppointmentIdHandler = async (context, event, callback) => {

    let {Appointments, LastTask} = JSON.parse(event.Memory),
        apptId = event['Field_ApptId_Value'],
        Listen = true,
        Say = `Appointment with ${apptId}, please check your appointment Id. What else can I help you with?`,
        Remember = false,
        Tasks = [
            "book_appointments",
            "list_appointments",
            "goodbye"
        ],
        Collect = false;
    
    const index = Appointments.findIndex(elem => {
        return elem.Id.toString() === apptId;
    });

    if(index !== -1){

        if(LastTask === "cancel_appointments"){
            Appointments.splice(index, 1);
            Remember = {
                "Appointments" : Appointments
            };
            Say = `Okay I've cancelled your appointment. What else can I help you with?`;
        }
        else{
            
            Listen = false;
            Remember = {
                "Appointments" : Appointments,
                "ApptId" : apptId
            };
            Say = `Okay lets reschedule your appointment. I just need you to answer a few questions.`;
            Collect = {
                "on_complete" : {
                    "redirect" : "task://complete_change_appointment"
                },
                "name" : "reschedule_appt",
                "questions" : [
                    {
                        "type" : "Twilio.DATE",
                        "question" : "Please tell me the date you want to come in.",
                        "name" : "appt_date",
                        "prefill" : "ApptDate"
                    },
                    {
                        "type" : "Twilio.TIME",
                        "question" : "Thanks, and what time?",
                        "name" : "appt_time",
                        "prefill" : "ApptTime"
                    }
                ]
            };
        }
    }
    
    speechOut(Say, Listen, Remember, Collect, Tasks, callback);
}

//goodbye handler function
const goodbyeHandler = async (context, event, callback) => {

    const Listen = false,
          Say = `Ok, I'll be here when you need me.`,
          Remember = false,
          Collect = false,
          Tasks = false;

    speechOut(Say, Listen, Remember, Collect, Tasks, callback);
}

//collect_fallback handler function
const collectFallbackHandler = async (context, event, callback) => {

    const Listen = true,
          Say = `Looks like you having trouble. Apologies for that. Let's start again, how can I help you today?`,
          Remember = false,
          Collect = false,
          Tasks = false;

    speechOut(Say, Listen, Remember, Collect, Tasks, callback);
}

//fallback handler function
const fallbackHandler = async (context, event, callback) => {

    const Listen = true,
          Say = `I'm sorry didn't quite get that. Please say that again.`,
          Remember = false,
          Collect = false,
          Tasks = false;

    speechOut(Say, Listen, Remember, Collect, Tasks, callback);
}

/** 
 * speech-out function 
 * @Say {string}             // message to speak out
 * @Listen {boolean}         // keep session true or false
 * @Remember {object}        // save data in remember object 
 * @Collect {object}
 * @callback {function}      // return twilio function response 
 * */ 
const speechOut = (Say, Listen, Remember, Collect, Tasks, callback) => {

    let responseObject = {
		"actions": []
    };

    if(Say)
        responseObject.actions.push(
            {
				"say": {
					"speech": Say
				}
			}
        );

    if(Listen)
    {
        if(Tasks)
            responseObject.actions.push(
                { 
                    "listen": {
                        "tasks" : Tasks
                    } 
                }
            );
        else
            responseObject.actions.push(
                { 
                    "listen": true 
                }
            );
    }

    if(Remember)
        responseObject.actions.push(
            {
                "remember" : Remember
            }
        )

    if(Collect)
        responseObject.actions.push(
            {
                "collect" : Collect
            }
        );

    // return twilio function response
    callback(null, responseObject);
}